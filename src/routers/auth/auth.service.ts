// src/auth/auth.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GetTokenDTO } from './dto/get-token.dto'
import { responseObject } from '../../common/helpers/response.helper'
import { PaginationMetaDto, ResponseDto } from '../../common/dto/response.dto'
import { UsersService } from '../users/users.service'
@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService, private usersService: UsersService) {}

  async generateTokens(user: any): Promise<ResponseDto<GetTokenDTO>> {
    const id:string = user.id
    const email:string = user.email

    const accessToken = this.jwtService.sign(
      { sub: id, email: email },
      { secret: process.env.JWT_SECRET, expiresIn: process.env.JWT_EXPIRES_IN },
    );

    const refreshToken = this.jwtService.sign(
      { sub: id },
      { secret: process.env.REFRESH_TOKEN_SECRET, expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN },
    );

    // Lưu refreshToken vào DB
    try {
      await this.usersService.updateRefreshToken(email, refreshToken);
    } catch (error) {
      // Xử lý lỗi tập trung
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Dastabase operation failed:', errorMessage)
      return responseObject(500, 'Failed to save refreshToken', {})
    }

    return responseObject(200, 'Success', {
      accessToken,
      refreshToken,
    });
  }

}
