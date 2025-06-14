// user.service.ts
import { ConflictException, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { PostgresService } from '../../database/postgres.service';
import { MailService } from '../../mail/mail.service';
import { hashPassword } from '../../utils/hashPassword';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

constructor(
    private readonly postgresService: PostgresService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  //Thêm mới User
  async createUser(
    email: string,
    name: string
    // passwordHash: string,
  ): Promise<{ email: string, name: string }> {
    try {
      const result = await this.postgresService.execute<{ email: string, name: string }>(
        `
        INSERT INTO sys_user (email, name, created_at)
        VALUES ($1, $2, NOW())
        RETURNING email,name
        `,
        [email, name],
      );
      this.logger.log(`Created user ${email}`);
      return result[0];
    } catch (error) {
      this.logger.error(`Failed to create user ${email}`, error.stack);
      throw error;
    }
  }

  // Thêm mới refreshToken cho 1 user
  async updateRefreshToken(
    email: string,
    refreshToken: string,
  ): Promise<boolean> {
    try {
      await this.postgresService.executeInTransaction([
        {
          sql: `
            UPDATE sys_user 
            SET refresh_token = $1, updated_at = NOW()
            WHERE email = $2
          `,
          params: [refreshToken, email],
        },
      ]);

      this.logger.log(`Updated refreshToken for user ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to update refreshToken for user ${email}`,
        error.stack,
      );
      throw error;
    }
  }

  // Lấy thông tin user bằng email
  async getUserByEmail(email: string) {
    try {
      const result = await this.postgresService.execute<{ id: string }>(
        "SELECT id FROM sys_user WHERE email = $1",
        [email]
      );

      if (result.length === 0) {
        this.logger.warn(`User with email ${email} not found`);
        return null;
      }

      this.logger.log(`Get user by email ${email} success`);
      return result[0]; // Trả về user đầu tiên tìm thấy
    } catch (error) {
      this.logger.error(
        `Failed to get user by email ${email}`,
        error.stack,
      );
      throw error;
    }
  }

  // Lấy thông tin user bằng id
  async getUserById(id: string) {
    try {
      const result = await this.postgresService.execute<{ id: string }>(
        "SELECT id, email, name, created_at, updated_at FROM sys_user WHERE id = $1",
        [id]
      );

      if (result.length === 0) {
        this.logger.warn(`User with id ${id} not found`);
        return null;
      }

      this.logger.log(`Get user by id ${id} success`);
      return result[0]; // Trả về user đầu tiên tìm thấy
    } catch (error) {
      this.logger.error(
        `Failed to get user by id ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  // Thêm mới user tự đăng ký
  async registerUser(
    email: string,
    password: string,
    confirmPassword: string,
  ): Promise<{ status: number; message: string }> {
    //1. Kiểm tra mật khẩu trùng khớp
    if (password !== confirmPassword) {
      return {
        status: 0,
        message: 'Passwords do not match'
      }
    }

    // 2. Kiểm tra email tồn tại
    if (await this.getUserByEmail(email)) {
      return {
        status: 0,
        message: 'Email already registered'
      }
    }

    // 3. Mã hóa mật khẩu
    const hashedPassword = await hashPassword(password);
    const verificationToken = uuidv4();
    const idUserNew = uuidv4();
    try {
      // 4. Bắt đầu transaction
      await this.postgresService.executeInTransaction([
        // 4a. Tạo user
        {
          sql: `
            INSERT INTO sys_user (id, email, password, status, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id
          `,
          params: [idUserNew, email, hashedPassword, "NEW"],
        },
        // 4b. Lưu verification token
        // {
        //   sql: `
        //     INSERT INTO sys_user_email_verification_tokens (id, sys_user_id, token, expires_at)
        //     VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')
        //   `,
        //   params: [uuidv4(),idUserNew, verificationToken],
        // },
      ]);
      //
      const resulTokenEmail = this.generateTokenEmail(idUserNew, email)
      // 5. Gửi email xác thực
      const verificationUrl = `${process.env.APP_URL}/auth/verify-email?token=${resulTokenEmail.tokenEmail}`;
      await this.mailService.sendMail({
        to: email,
        subject: 'Verify Your Email',
        html: `
          <h1>Welcome!</h1>
          <p>Please click the link below to verify your email:</p>
          <a href="${verificationUrl}">Verify Email</a>
          <p>Link expires in 24 hours.</p>
        `,
      });

      return {
        status: 1,
        message: 'Registration successful. Please check your email for verification.',
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw new InternalServerErrorException('Registration failed');
    }
  }

  generateTokenEmail(id: string, email: string ): {tokenEmail: string} {
    if (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
      throw new Error('JWT secrets are not configured');
    }

    const payload = {
      sub: id,
      email: email
    };

    const tokenEmail = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });

    try {
      return { tokenEmail };
    } catch (error) {
      this.logger.error(`Failed to update refresh token for user ${email}`, error.stack);
      throw new UnauthorizedException('Failed to generate tokens');
    }
  }
}