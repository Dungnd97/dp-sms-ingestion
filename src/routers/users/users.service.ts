import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { PostgresService } from '../../database/postgres.service'
import { MailService } from '../../mail/mail.service'
import { hashPassword } from '../../utils/hashPassword'
import { v4 as uuidv4 } from 'uuid'
import { UserStatus } from '../../common/enums/user-status.enum'
import * as jwt from 'jsonwebtoken'
import { JwtService } from '@nestjs/jwt'
import { parseExpireTime } from '../../utils/parseExpireTime'
import { responseObject } from '../../common/helpers/response.helper'

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(
    private readonly postgresService: PostgresService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  private returnMessage = (status: number, message: string, actionScreen?: string) => ({
    status,
    message,
    actionScreen,
  })
  // A. Các service nghiệp vụ
  //I. Thêm mới User trong TH SSO với tài khoản GG và Email chưa tồn tại trong DB
  async createUserLoginGoogleAccount(email: string, name: string): Promise<{ id:string, email: string; name: string }> {
    // 1. Kiểm tra email tồn tại
    const getUserByEmail = await this.getUserByEmail(email)
    // 1.1 TH tồn tại user
    if (getUserByEmail) {
      const { status, id } = getUserByEmail
      // 1.1.1 TH tồn tại user trạng thái New -> Update để ko cần Verify nữa
      if (status === UserStatus.New) {
        try {
          await this.postgresService.executeInTransaction([
            {
              sql: `
            UPDATE sys_user 
            SET status = $1, name = $2, updated_at = NOW()
            WHERE id = $3
            `,
              params: [UserStatus.Active, name, id],
            },
          ])

          this.logger.log(
            `Cập nhật trạng thái New -> Active thành công, trường hợp tồn tại user trạng thái New khi đăng nhập bằng SSO GG ${email}`,
          )
          return { id, email, name }
        } catch (error) {
          this.logger.error(
            `Cập nhật trạng thái New -> Active không thành công, trường hợp tồn tại user trạng thái New khi đăng nhập bằng SSO GG ${email}`,
            error.stack,
          )
          throw error
        }
      }

      // 1.1.2 TH tồn tại user trạng thái Inactive -> Login không thành công
      if (getUserByEmail.status === UserStatus.Inactive) {
        throw new UnauthorizedException(
          'Tài khoản Email của bạn đã bị khóa tại hệ thống của chúng tôi. Vui lòng liên hệ Admin để được hỗ trợ.',
        )
      }

      return { id, email, name }
    }

    // 1.2 TH không tồn tại user
    const newUserId = uuidv4()

    try {
      const [result] = await this.postgresService.execute<{ id:string, email: string; name: string }>(
        `
        INSERT INTO sys_user (id, email, name, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, email, name
        `,
        [newUserId, email, name, UserStatus.Active],
      )
      console.log(result)
      this.logger.log(`Thêm mới user thành công với email: ${email}`)
      return result
    } catch (error) {
      this.logger.error(`Thêm mới user không thành công với email: ${email}`, error.stack)
      throw error
    }
  }

  //II. Thêm mới refreshToken cho 1 user
  async updateRefreshToken(email: string, refreshToken: string): Promise<boolean> {
    const sql = `
    UPDATE sys_user 
    SET refresh_token = $1, updated_at = NOW()
    WHERE email = $2
  `

    const params = [refreshToken, email]

    try {
      await this.postgresService.executeInTransaction([{ sql, params }])

      this.logger.log(`Updated refreshToken for user ${email}`)
      return true
    } catch (error) {
      this.logger.error(`Failed to update refreshToken for user ${email}`, error.stack)
      throw error
    }
  }

  //III. Lấy thông tin user bằng email
  async getUserByEmail(email: string) {
    try {
      const result = await this.postgresService.execute<{ email: string }>(
        'SELECT id, name, status, updated_at FROM sys_user WHERE email = $1',
        [email],
      )

      if (result.length === 0) {
        this.logger.warn(`Người dùng với email: ${email} không tồn tại`)
        return null
      }

      this.logger.log(`Lấy thông tin người dùng theo email ${email} success`)
      return result[0] // Trả về user đầu tiên tìm thấy
    } catch (error) {
      this.logger.error(`FKhông thể lấy được người dùng theo by email ${email}`, error.stack)
      throw error
    }
  }

  //IV. Lấy thông tin user bằng id
  async getUserById(id: string) {
    try {
      const result = await this.postgresService.execute<{ id: string }>(
        'SELECT id, email, name, status, created_at, updated_at FROM sys_user WHERE id = $1',
        [id],
      )

      if (result.length === 0) {
        this.logger.log(`Người dùng với id: ${id} không tồn tại`)
        return null
      }

      this.logger.log(`Lấy thông tin người dùng với id: ${id} thành công`)
      return result[0]
    } catch (error) {
      this.logger.error(`Không thể lấy được người dùng theo id: ${id}`, error.stack)
      throw error
    }
  }

  //V. Thêm mới user tự đăng ký
  async registerUser(
    email: string,
    password: string,
    confirmPassword: string,
  ): Promise<{ status: number; message: string; actionScreen?: string }> {

    //1. Kiểm tra mật khẩu trùng khớp
    if (password !== confirmPassword) {
      return this.returnMessage(0, 'Mật khẩu không khớp')
    }

    // 2. Kiểm tra email tồn tại
    const user = await this.getUserByEmail(email)
    if (user) {
      // 2.1 TH tồn tại user ở trạng thái Active
      if (user.status == UserStatus.Active) {
        return this.returnMessage(
          0,
          'Email đã được đăng ký. Vui lòng hãy đăng ký địa chỉ Email khác hoặc ấn Quên mật khẩu để cài đặt lại mật khẩu cho Email của bạn',
          'USER_LOGIN',
        )
      }
      // 2.2 TH tồn tại user ở trạng thái New
      if (user.status == UserStatus.New) {
        const updatedAt = new Date(user.updated_at as string).getTime()
        const now = Date.now()
        const expireMs = parseExpireTime(process.env.JWT_EXPIRES_IN_EMAIL || '24h')

        // 2.2.1 TH email chưa hết thời hạn xác thực -> không gửi lại email
        if (now < updatedAt + expireMs) {
          return this.returnMessage(
            1,
            'Đăng ký thành công. Vui lòng kiểm tra email của bạn để xác minh. Nếu trong Hộp thư đến của bạn không thấy có, vui lòng kiểm tra ở mục Thư rác',
          )
        }
        // 2.2.2 TH email hết thời hạn xác thực -> gửi lại email
        const resulTokenEmail = this.generateTokenEmail(user.id, user.email)
        const verificationUrl = `${process.env.APP_URL}/auth/user/verify-email?token=${resulTokenEmail.tokenEmail}`
        try {
          await this.sendVerificationEmail(email, verificationUrl)
          await this.postgresService.executeInTransaction([
            // 3.1. Tạo user
            {
              sql: `
                  UPDATE sys_user 
                  SET updated_at = NOW()
                  WHERE id = $1
          `,
              params: [user.id],
            },
          ])
          return this.returnMessage(
            1,
            'Đăng ký thành công. Vui lòng kiểm tra email của bạn để xác minh. Nếu trong Hộp thư đến của bạn không thấy có, vui lòng kiểm tra ở mục Thư rác',
          )
        } catch (error) {
          console.error('Gửi lại email xác thực lỗi:', error)
          throw new InternalServerErrorException('Đăng ký không thành công')
        }
      }
    }

    // 3. User không tồn tại -> Tạo mới User
    const hashedPassword = await hashPassword(password)
    const newUserId = uuidv4()
    const tokenInfo = this.generateTokenEmail(newUserId, email)
    const verificationUrl = `${process.env.APP_URL}/auth/user/verify-email?token=${tokenInfo.tokenEmail}`

    try {
      await this.sendVerificationEmail(email, verificationUrl)
      await this.postgresService.executeInTransaction([
        // 3.1. Tạo user
        {
          sql: `
            INSERT INTO sys_user (id, email, password, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING id
          `,
          params: [newUserId, email, hashedPassword, UserStatus.New],
        },
      ])
      return this.returnMessage(
        1,
        'Đăng ký thành công. Vui lòng kiểm tra email của bạn để xác minh. Nếu trong Hộp thư đến của bạn không thấy có, vui lòng kiểm tra ở mục Thư rác',
      )
    } catch (error) {
      console.error('Đăng ký lỗi:', error)
      throw new InternalServerErrorException('Đăng ký không thành công')
    }
  }

  //VII. Xác thực link email đăng ký
  async verifyEmailToken(token: string): Promise<{ status: number; message: string }> {
    try {
      // 1. Giải mã và xác minh token
      if (!process.env.JWT_SECRET_EMAIL) {
        this.logger.error('JWT_SECRET_EMAIL không tồn tại trong cấu hình')
        throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn')
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET_EMAIL) as {
        sub: string
        email: string
      }

      if (!payload.sub) {
        this.logger.error('Dữ liệu trong token thiếu trường id')
        throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn')
      }

      // 2. Kiểm tra tài khoản và trạng thái xác thực email
      const user = await this.getUserById(payload.sub)
      console.log(user)
      if (!user || user.length === 0) {
        return this.returnMessage(0, 'Tài khoản không tồn tại trong hệ thống. Vui lòng đăng ký lại.', 'USER_LOGIN')
      }

      if (user.status === UserStatus.Active) {
        return this.returnMessage(
          0,
          'Tài khoản này đã được kích hoạt trước đó. Vui lòng thực hiện đăng nhập dựa trên các thông tin mà bạn đã đăng ký.',
        )
      }
      // 3. Cập nhật trạng thái xác thực email
      try {
        await this.postgresService.executeInTransaction([
          {
            sql: `
            UPDATE sys_user 
            SET status = $1, updated_at = NOW()
            WHERE id = $2 AND status = $3
            `,
            params: [UserStatus.Active, user.id, UserStatus.New],
          },
        ])

        this.logger.log('Cập nhật trạng thái New -> Active thành công, trường hợp xác thực email')
        return {
          status: 1,
          message:
            'Tài khoản của bạn đã được kích hoạt thành công. Vui lòng thực hiện đăng nhập dựa trên các thông tin mà bạn đã đăng ký.',
        }
      } catch (error) {
        this.logger.error('Cập nhật trạng thái New -> Active không thành công, trường hợp xác thực email', error.stack)
        throw error
      }
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return {
          status: 0,
          message: 'Thời gian xác thực đã hết hạn. Vui lòng thực hiện đăng ký lại.',
        }
      }      
      this.logger.error(`Có lỗi xảy ra trong quá trình xác thực email`, error.stack)
      throw new UnauthorizedException('Có lỗi xảy ra trong quá trình xác thực email')
    }
  }

  // B. Các service dùng nội bộ
  // I. Hàm sinh token
  generateTokenEmail(id: string, email: string): { tokenEmail: string } {
    if (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
      throw new Error('Không có cấu hình mã bí mật')
    }

    const payload = {
      sub: id,
      email: email,
    }

    const tokenEmail = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET_EMAIL,
      expiresIn: process.env.JWT_EXPIRES_IN_EMAIL || '24h',
    })

    try {
      return { tokenEmail }
    } catch (error) {
      this.logger.error(`Lỗi không sinh được token cho việc xác thực email: ${email}`, error.stack)
      throw new UnauthorizedException('Không tạo được token')
    }
  }

  // II. Gửi chung email
  async sendVerificationEmail(email: string, verificationUrl: string) {
    await this.mailService.sendMail({
      to: email,
      subject: 'Xác minh địa chỉ email của bạn',
      html: `
      <h1>Xin chào!</h1>
      <p>Vui lòng nhấp vào liên kết bên dưới để xác minh email của bạn:</p>
      <a href="${verificationUrl}">Xác minh email</a>
      <p>Liên kết sẽ hết hạn sau 24 giờ.</p>
    `,
    })
  }
}
