import { Controller, Get, Req, UseGuards, Post, Body, UnauthorizedException, HttpCode } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { responseObject } from '../../common/helpers/response.helper'
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger'

@ApiTags('Auth')
@Controller('')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Get('sso/google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google login redirect' })
  @ApiResponse({ status: 1, description: 'Redirect to Google login page' })
  async googleAuth() {
    // Passport sẽ tự redirect đến Google
  }

  @Get('sso/google/redirect')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google redirect callback' })
  @ApiResponse({ status: 200, description: 'Return tokens after Google login' })
  async googleAuthRedirect(@Req() req) {
    const user = req.user
    console.log(user)
    const tokens = await this.authService.generateTokens(user)
    return responseObject(1, 'Success', null, tokens)
  }

  @Post('validate-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Validate JWT token and return user info' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'Bearer eyJhbGciOi...' },
      },
      required: ['token'],
    },
  })
  @ApiResponse({ status: 200, description: 'Token valid, user info returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async validateToken(@Body('token') token: string) {
    try {
      const user = await this.authService.validateToken(token)
      return responseObject(1, 'Validate Token success', null, user)
    } catch (err) {
      throw new UnauthorizedException(err.message)
    }
  }
}
