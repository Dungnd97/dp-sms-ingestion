// src/auth/auth.service.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { GetTokenDTO } from './dto/get-token.dto'
import { UsersService } from '../users/users.service'
import * as jwt from 'jsonwebtoken'

interface JwtPayload {
  sub: string
  email?: string
  username?: string
  role?: string
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async generateTokens(user: { id: string; email: string }): Promise<GetTokenDTO> {
    const { JWT_SECRET, REFRESH_TOKEN_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } = process.env

    if (!JWT_SECRET || !REFRESH_TOKEN_SECRET) {
      this.logger.error('JWT secrets không được cấu hình')
      throw new UnauthorizedException('Token lỗi cấu hình')
    }

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: JWT_SECRET, expiresIn: JWT_EXPIRES_IN || '1h' },
    )

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { secret: REFRESH_TOKEN_SECRET, expiresIn: REFRESH_TOKEN_EXPIRES_IN || '7d' },
    )

    try {
      await this.usersService.updateRefreshToken(user.id, refreshToken)
      return { accessToken, refreshToken }
    } catch (error) {
      this.logger.error(`Không cập nhật được refresh token cho user có id: ${user.id}`, error.stack)
      throw new UnauthorizedException('Không tạo được refresh tokens')
    }
  }

  async validateToken(token: string): Promise<{ id: string; username?: string; role?: string }> {
    try {
      token = token.replace(/^Bearer\s+/i, '')

      if (!process.env.JWT_SECRET) {
        this.logger.error(`Token secret không được cấu hình}`)
        throw new UnauthorizedException('Token không hợp lệ')
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload

      if (!payload.sub) {
        this.logger.error('Token thiếu sub')
        throw new UnauthorizedException('Token không hợp lệ')
      }

      const user = await this.usersService.getUserById(payload.sub)

      return user
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định'
      this.logger.error(`Xác thực Token không thành công: ${errorMessage}`)

      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token không hợp lệ')
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Token không hợp lệ')
      }
      throw new UnauthorizedException('Xác thực không thành công')
    }
  }

  async verifyRefreshToken(refreshToken: string): Promise<any> {
    try {
      const { REFRESH_TOKEN_SECRET } = process.env

      if (!REFRESH_TOKEN_SECRET) {
        this.logger.error('JWT secrets không được cấu hình')
        throw new UnauthorizedException('Token lỗi cấu hình')
      }
      const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as any
      if (!payload.sub) {
        this.logger.error('Token thiếu sub')
        throw new UnauthorizedException('Token không hợp lệ')
      }
      // Kiểm tra token có trùng với token trong DB không
      const user = await this.usersService.checkInfoRefreshToken(payload.sub)
      console.log(user)

      if (!user || user.refresh_token !== refreshToken) {
        throw new UnauthorizedException('Refresh token không hợp lệ')
      }
      return user
    } catch (err) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn')
    }
  }
}
