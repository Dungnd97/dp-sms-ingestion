import { Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token không hợp lệ');
      }
      throw err;
    }

    if (!user) {
      if (info && info.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token không hợp lệ');
      }
      throw new UnauthorizedException('Xác thực người dùng không thành công');
    }
    
    return user;
  }
}
