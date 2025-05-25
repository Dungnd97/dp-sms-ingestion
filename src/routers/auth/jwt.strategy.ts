// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: (req) => req.headers.authorization?.split(' ')[1],  // Lấy token từ header Authorization
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  // async validate(payload: any) {
  //   return this.authService.verifyToken(payload);
  // }
}
