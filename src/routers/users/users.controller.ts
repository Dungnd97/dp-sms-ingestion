import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { responseObject } from '../../common/helpers/response.helper'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { RegisterUserDto } from './dto/register-user.dto'
import { AuthGuard } from '@nestjs/passport'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { ResetPasswordTokenQueryDto } from './dto/reset-password-token-query.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'

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
  @ApiOperation({ summary: 'Đăng ký tài khoản' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  @ApiBody({ type: RegisterUserDto })
  async register(@Body() dto: RegisterUserDto) {
    const result = await this.usersService.registerUser(dto.email, dto.password, dto.confirmPassword)
    return responseObject(result.status, result.message, result.actionScreen)
  }

  @Get('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Xác thực Email khi đăng ký tài khoản' })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Token được vào link gửi qua email để xác thực tài khoản',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async verifyEmail(@Query('token') token: string) {
    const result = await this.usersService.verifyEmailToken(token)
    console.log(result)
    return responseObject(result.status, result.message, result.actionScreen)
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Gửi email đặt lại mật khẩu' })
  @ApiResponse({ status: 200, description: 'Email khôi phục mật khẩu đã được gửi nếu tồn tại' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const result = await this.usersService.sendResetPasswordEmail(body.email);
    return responseObject(result.status, result.message, result.actionScreen);
  }

  @Get('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Kiểm tra token reset password' })
  async validateResetPasswordToken(@Query() query: ResetPasswordTokenQueryDto) {
    const { token } = query;
    const result = await this.usersService.validateResetPasswordEmailToken(token);
    return responseObject(result.status, result.message, result.actionScreen);
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset mật khẩu bằng token' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    const { token, newPassword, confirmPassword } = resetDto;
    const result = await this.usersService.resetPassword(token, newPassword, confirmPassword);
    return responseObject(result.status, result.message, result.actionScreen);
  }
}
