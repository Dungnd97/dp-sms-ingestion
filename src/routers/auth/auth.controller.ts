import { Controller, Get, Req, UseGuards, Post, Body, UnauthorizedException, HttpCode } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { responseObject } from '../../common/helpers/response.helper'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger'

@ApiTags('SSO')
@Controller('sso')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google login redirect' })
  @ApiResponse({ status: 1, description: 'Redirect to Google login page' })
  async googleAuth() {
    // Passport sẽ tự redirect đến Google
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google redirect callback' })
  @ApiResponse({ status: 200, description: 'Return tokens after Google login' })
  async googleAuthRedirect(@Req() req) {
    try {
      const user = req.user
      const tokens = await this.authService.generateTokens(user)
      return responseObject(1, 'Success', '123', tokens)
    } catch (error) {
      throw new UnauthorizedException(error.message)
    }
  }

  @ApiBearerAuth('jwt')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user info' })
  @Get('me')
  getMe(@Req() req) {
    try {
      return responseObject(1, 'Current user info', '123', req.user)
    } catch (error) {
      throw new UnauthorizedException(error.message)
    }
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
      return responseObject(1, 'Validate Token success', '123', user)
    } catch (err) {
      throw new UnauthorizedException(err.message)
    }
  }
}
