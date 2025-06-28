import { Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common'
import { PostgresService } from '../../database/postgres.service'
import { MailService } from '../../mail/mail.service'
import { hashPassword } from '../../utils/hashPassword'
import { v4 as uuidv4 } from 'uuid'
import { UserStatus } from '../../common/enums/user-status.enum'
import { UserType } from '../../common/enums/user-type.enum'
import * as jwt from 'jsonwebtoken'
import { JwtService } from '@nestjs/jwt'
import { parseExpireTime } from '../../utils/parseExpireTime'
import * as bcrypt from 'bcrypt'

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name)

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
  async createUserLoginGoogleAccount(
    email: string,
    name: string,
  ): Promise<{ id: string; email: string; name: string }> {
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
      const [result] = await this.postgresService.execute<{ id: string; email: string; name: string }>(
        `
        INSERT INTO sys_user (id, email, name, status, type, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, email, name
        `,
        [newUserId, email, name, UserStatus.Active, UserType.User],
      )
      return result
    } catch (error) {
      this.logger.error(`Thêm mới user không thành công với email: ${email}`, error.stack)
      throw error
    }
  }

  //II. Thêm mới refreshToken cho 1 user
  async updateRefreshToken(id: string, refreshToken: string): Promise<boolean> {
    const sql = `
    UPDATE sys_user 
    SET refresh_token = $1, updated_at = NOW()
    WHERE id = $2
  `

    const params = [refreshToken, id]

    try {
      await this.postgresService.executeInTransaction([{ sql, params }])
      return true
    } catch (error) {
      this.logger.error(`Cập nhật refreshToken KHÔNG thành công cho user có id: ${id}`, error.stack)
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
        const verificationUrl = `${process.env.APP_URL_VERIFY_EMAIL_LOGIN}?token=${resulTokenEmail.tokenEmail}`
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
    const verificationUrl = `${process.env.APP_URL_VERIFY_EMAIL_LOGIN}?token=${tokenInfo.tokenEmail}`

    try {
      await this.sendVerificationEmail(email, verificationUrl)
      await this.postgresService.executeInTransaction([
        // 3.1. Tạo user
        {
          sql: `
            INSERT INTO sys_user (id, email, password, status, type, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            RETURNING id
          `,
          params: [newUserId, email, hashedPassword, UserStatus.New, UserType.User],
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
  async verifyEmailToken(token: string): Promise<{ status: number; message: string; actionScreen?: string }> {
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
        return this.returnMessage(
          1,
          'Tài khoản của bạn đã được kích hoạt thành công. Vui lòng thực hiện đăng nhập dựa trên các thông tin mà bạn đã đăng ký.',
          'USER_LOGIN',
        )
      } catch (error) {
        this.logger.error('Cập nhật trạng thái New -> Active không thành công, trường hợp xác thực email', error.stack)
        throw error
      }
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return this.returnMessage(0, 'Thời gian xác thực đã hết hạn. Vui lòng thực hiện đăng ký lại')
      }
      this.logger.error(`Có lỗi xảy ra trong quá trình xác thực email`, error.stack)
      throw new UnauthorizedException('Có lỗi xảy ra trong quá trình xác thực email')
    }
  }

  //VIII. Check thông tin khi login
  async checkInfoLogin(email: string, password: string) {
    try {
      const [user] = await this.postgresService.execute<{ email: string }>(
        'SELECT id, password, status, updated_at FROM sys_user WHERE email = $1',
        [email],
      )

      if (!user) {
        throw new UnauthorizedException('Thông tin tài khoản hoặc mật khẩu không chính xác')
      }

      if (typeof user.password !== 'string') {
        throw new UnauthorizedException('Thông tin tài khoản hoặc mật khẩu không chính xác 123')
      }

      const isMatch = await bcrypt.compare(password, user.password as string)

      if (!isMatch) {
        throw new UnauthorizedException('Thông tin tài khoản hoặc mật khẩu không chính xác')
      }

      if (user.status === UserStatus.Inactive) {
        throw new UnauthorizedException('Tài khoản đã bị khóa')
      }

      if (user.status === UserStatus.New) {
        throw new UnauthorizedException(
          'Tài khoản của bạn chưa được kích hoạt. Vui lòng check Hộp thư thoại ở email hoặc thực hiện đăng ký lại nếu quá 24h chưa email xác thực gửi về',
        )
      }

      return user
    } catch (error) {
      this.logger.error(`Kiểm tra thông tin đăng nhập không thành công ${email}`, error.stack)
      throw error
    }
  }

  //IX. Check thông tin khi refreshToken
  async checkInfoRefreshToken(id: string) {
    try {
      const [user] = await this.postgresService.execute<{ email: string }>(
        'SELECT id, refresh_token, status FROM sys_user WHERE id = $1',
        [id],
      )

      if (!user) {
        throw new UnauthorizedException('Refresh token không hợp lệ')
      }

      return user
    } catch (error) {
      throw new UnauthorizedException(
        'Có lỗi xảy ra trong quá trình sinh lại phiên đăng nhập. Vui lòng thực hiện sau ít phút',
      )
    }
  }

  //X.Gửi Email để đổi mật khẩu
  async sendResetPasswordEmail(email: string): Promise<{ status: number; message: string; actionScreen?: string }> {
    const user = await this.getUserByEmail(email)

    const defaultMessage =
      'Nếu email tồn tại, một liên kết đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra Hộp thư thoại hoặc Thư rác trong địa chỉ email bạn vừa nhập.'

    if (!user) {
      return this.returnMessage(1, defaultMessage)
    }

    const updatedAt = new Date(user.updated_at as string).getTime()
    const now = Date.now()
    const expireMs = parseExpireTime(process.env.JWT_EXPIRES_IN_RESET_PASSWORD || '15m')

    if (now < updatedAt + expireMs) {
      // Trong khoảng 15 phút thì không gửi lại email
      return this.returnMessage(1, defaultMessage)
    }

    const payload = {
      sub: user.id,
      email: user.email,
    }

    const tokenEmail = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET_RESET_PASSWORD,
      expiresIn: process.env.JWT_EXPIRES_IN_RESET_PASSWORD || '15m',
    })

    const resetUrl = `${process.env.APP_URL_FORGOT_PASSWORD}?token=${tokenEmail}`

    const htmlContent = `
      <p>Xin chào ${user.name || ''},</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu. Vui lòng nhấn vào liên kết dưới đây để tiếp tục:</p>
      <a href="${resetUrl}">Đặt lại mật khẩu</a>
      <p>Liên kết sẽ hết hạn sau 15 phút.</p>
      <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    `

    await this.mailService.sendMail({
      to: email,
      subject: 'Yêu cầu đặt lại mật khẩu',
      html: htmlContent,
    })

    await this.postgresService.executeInTransaction([
      {
        sql: `
        UPDATE sys_user
        SET updated_at = NOW()
        WHERE id = $1
      `,
        params: [user.id],
      },
    ])
    return this.returnMessage(1, defaultMessage)
  }

  //XI.Kiểm tra Token đổi mật khẩu
  async validateResetPasswordEmailToken(
    token: string,
  ): Promise<{ status: number; message: string; actionScreen?: string }> {
    try {
      const secret = process.env.JWT_SECRET_RESET_PASSWORD
      if (!secret) {
        throw new UnauthorizedException('Cấu hình token reset mật khẩu không tồn tại')
      }

      const payload = jwt.verify(token, secret) as { sub: string; email: string }

      if (!payload.sub) {
        return this.returnMessage(0, 'Token không hợp lệ hoặc đã hết hạn')
      }

      const user = await this.getUserById(payload.sub)

      if (!user) {
        return this.returnMessage(0, 'Tài khoản không tồn tại. Vui lòng đăng ký lại.', 'USER_REGISTER')
      }

      if (user.status !== UserStatus.Active) {
        return this.returnMessage(
          0,
          'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra Hộp thư thoại hoặc Thư rác trong địa chỉ email. Nếu quá 24h kể từ lúc đăng ký bạn không nhận được email xác thực, vui lòng thực hiện lại đăng ký.',
          'USER_LOGIN',
        )
      }

      return this.returnMessage(1, 'Xác thực hợp lệ. Bạn có thể đổi mật khẩu.')
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return this.returnMessage(0, 'Xác thực không hợp lệ. Vui lòng gửi lại yêu cầu.')
      }

      return this.returnMessage(0, 'Xác thực không hợp lệ.')
    }
  }

  //XII. Cấp lại mật khẩu
  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ status: number; message: string; actionScreen?: string }> {
    if (newPassword !== confirmPassword) {
      return this.returnMessage(0, 'Mật khẩu và xác nhận mật khẩu không khớp')
    }

    try {
      if (!process.env.JWT_SECRET_RESET_PASSWORD) {
        return this.returnMessage(0, 'Thiếu cấu hình bảo mật reset password')
      }

      let payload: { sub: string; email: string }

      try {
        payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET_RESET_PASSWORD,
        })
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          return this.returnMessage(0, 'Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng gửi lại yêu cầu.')
        } else if (err.name === 'JsonWebTokenError') {
          return this.returnMessage(0, 'Token không hợp lệ. Vui lòng kiểm tra lại liên kết.')
        }
        return this.returnMessage(0, 'Lỗi xác thực token.')
      }

      if (!payload?.sub) {
        return this.returnMessage(0, 'Token không hợp lệ.')
      }

      const user = await this.getUserById(payload.sub)
      if (!user) {
        return this.returnMessage(0, 'Tài khoản không tồn tại')
      }

      const hashedPassword = await hashPassword(newPassword)
      await this.updatePasswordById(user.id, hashedPassword)

      return this.returnMessage(
        1,
        'Mật khẩu đã được thay đổi thành công. Vui lòng đăng nhập lại với mật khẩu mới.',
        'USER_LOGIN',
      )
    } catch (error) {
      this.logger.error(error.stack)
      return this.returnMessage(0, 'Có lỗi xảy ra khi đặt lại mật khẩu')
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

  //III. Cập nhật mật khẩu theo id
  async updatePasswordById(userId: string, hashedPassword: string): Promise<void> {
    try {
      await this.postgresService.executeInTransaction([
        {
          sql: `
          UPDATE sys_user
          SET password = $1, updated_at = NOW()
          WHERE id = $2
        `,
          params: [hashedPassword, userId],
        },
      ])
    } catch (error) {
      this.logger.error(`Lỗi khi cập nhật mật khẩu cho user ${userId}`, error.stack)
      throw new InternalServerErrorException('Không thể cập nhật mật khẩu')
    }
  }
}
