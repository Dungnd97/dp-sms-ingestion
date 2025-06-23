import { Body, Controller, Get, HttpCode, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { responseObject } from '../../common/helpers/response.helper'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { RegisterUserDto } from './dto/register-user.dto'
import { AuthGuard } from '@nestjs/passport'

@ApiTags('User')
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @ApiBearerAuth('jwt')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lấy dữ liệu thông tin người dùng sau khi đăng nhập thành công' })
  @ApiResponse({ status: 200, description: 'Thông tin người dùng hiện tại' })
  @Get('getUserInfo')
  getUserInfo(@Req() req) {
    return responseObject(1, null, null, req.user)
  }

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
  async register(@Body() dto: RegisterUserDto) {
    const result = await this.usersService.registerUser(dto.email, dto.password, dto.confirmPassword)
    return responseObject(result.status, result.message, result.actionScreen)
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
