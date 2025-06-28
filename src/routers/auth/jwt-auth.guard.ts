import { Injectable, UnauthorizedException, ExecutionContext, Logger } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name)

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    this.logger.log('🔐 Bắt đầu xác thực')
    this.logger.debug(`Lỗi: ${JSON.stringify(err)}`)
    this.logger.debug(`User: ${JSON.stringify(user)}`)
    this.logger.debug(`Info: ${JSON.stringify(info)}`)

    if (err) {
      if (err.name === 'TokenExpiredError') {
        this.logger.warn('⛔ Token đã hết hạn')
        throw new UnauthorizedException('Token đã hết hạn')
      }
      this.logger.error('⛔ Lỗi xác thực', err.stack)
      throw err
    }

    if (!user) {
      if (info && info.name === 'JsonWebTokenError') {
        this.logger.warn('⛔ Token không hợp lệ')
        throw new UnauthorizedException('Token không hợp lệ')
      }
      this.logger.warn('⛔ Không xác thực được người dùng')
      throw new UnauthorizedException('Xác thực người dùng không thành công')
    }

    this.logger.log('✅ Xác thực thành công')
    return user
  }
}
