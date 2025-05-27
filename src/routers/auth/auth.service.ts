// src/auth/auth.service.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GetTokenDTO } from './dto/get-token.dto';
import { UsersService } from '../users/users.service';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: string;
  email?: string;
  username?: string;
  role?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) { }

  async generateTokens(user: { id: string; email: string }): Promise<GetTokenDTO> {
    if (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
      throw new Error('JWT secrets are not configured');
    }

    const payload = {
      sub: user.id,
      email: user.email
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: process.env.REFRESH_TOKEN_SECRET,
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      },
    );

    try {
      await this.usersService.updateRefreshToken(user.email, refreshToken);
      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(`Failed to update refresh token for user ${user.email}`, error.stack);
      throw new UnauthorizedException('Failed to generate tokens');
    }
  }

  async validateToken(token: string): Promise<{ id: string; username?: string; role?: string }> {
    try {
      token = token.replace(/^Bearer\s+/i, '');

      if (!process.env.JWT_SECRET) {
        this.logger.error('JWT_SECRET is not configured');
        throw new UnauthorizedException('Authentication failed');
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

      if (!payload.sub) {
        this.logger.error('Invalid token payload: missing sub field');
        throw new UnauthorizedException('Invalid token');
      }

      const user = await this.usersService.getUserById(payload.sub);

      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Token validation failed: ${errorMessage}`);
      
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }
}