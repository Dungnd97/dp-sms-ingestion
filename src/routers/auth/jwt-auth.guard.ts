import { Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err) {
      // Có lỗi hệ thống hoặc lỗi từ passport, ví dụ token hết hạn
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      throw err;
    }

    if (!user) {
      // Token không đúng hoặc không có user
      if (info && info.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      // Hoặc nếu không có user nhưng không rõ lỗi, mặc định
      throw new UnauthorizedException('User authentication failed');
    }

    // Nếu có user, trả về user tiếp tục xử lý
    return user;
  }
}
