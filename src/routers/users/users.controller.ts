import { Body, Controller, Get, HttpCode, Post, Query, UnauthorizedException } from '@nestjs/common'
import { UsersService } from './users.service'
import { responseObject } from '../../common/helpers/response.helper'
import { ApiBody, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger'

@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @HttpCode(200)
  @ApiOperation({ summary: 'Register account' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: '123456aB@' },
        confirmPassword: { type: 'string', example: '123456aB@' },
      },
      required: ['email', 'password', 'confirmPassword'],
    },
  })
  async register(@Body() body: { email: string; password: string; confirmPassword: string }) {
    try {
      const result = await this.usersService.registerUser(body.email, body.password, body.confirmPassword)
      return responseObject(result.status, result.message, result.screen)
    } catch (error) {
      throw new UnauthorizedException(error.message)
    }
  }

  @Get('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify Email' })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Token được vào link gửi qua email để xác thực tài khoản',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Success' })
  async verifyEmail(@Query('token') token: string) {
    return this.usersService.verifyEmailToken(token)
  }
}
