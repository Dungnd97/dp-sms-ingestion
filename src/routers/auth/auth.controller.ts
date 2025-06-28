import { Controller, Get, Req, UseGuards, Post, Body, UnauthorizedException, HttpCode } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { UserService } from '../user/user.service'
import { responseObject } from '../../common/helpers/response.helper'
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger'
import { LoginDto } from './dto/login.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { TokenDto } from './dto/token'
import { MessagePattern } from '@nestjs/microservices'

@ApiTags('Auth')
@Controller('')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Get('sso/google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Điều hướng sang login bằng tài khoản Google' })
  @ApiResponse({ status: 200, description: 'Chuyển hướng đến trang đăng nhập của Google' })
  async googleAuth() {
    // Passport sẽ tự redirect đến Google
  }

  @Get('sso/google/redirect')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google gọi lại' })
  @ApiResponse({ status: 200, description: 'Trả token sau khi đăng nhập Google thành công' })
  async googleAuthRedirect(@Req() req) {
    const user = req.user
    const userNew = {
      id: user.id,
      email: user.email,
    }
    const tokens = await this.authService.generateTokens(userNew) // tạo access/refresh token
    return responseObject(1, 'Thành công', null, tokens)
  }

  @Post('validate-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Xác thực Token, trả kèm thông tin người dùng' })
  @ApiBody({ type: TokenDto })
  @ApiResponse({ status: 200, description: 'Token hợp lệ, user info được trả về' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ, hoặc hết hạn' })
  async validateToken(@Body() tokenDto: TokenDto) {
    const user = await this.authService.validateToken(tokenDto.token)
    return responseObject(1, 'Xác thực Token thành công', null, user)
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đăng nhập bằng tài khoản là địa chỉ email và mật khẩu' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công, trả về token' })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không đúng' })
  async login(@Body() loginDto: LoginDto) {
    const { email, password } = loginDto

    const user = await this.userService.checkInfoLogin(email, password) // kiểm tra email/pass

    const userNew = {
      id: user.id,
      email: user.email,
    }

    const tokens = await this.authService.generateTokens(userNew) // tạo access/refresh token

    return responseObject(1, 'Đăng nhập thành công', 'Auth/Login', tokens)
  }

  @Post('refresh-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cấp lại accessToken mới bằng refreshToken' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token được cấp lại thành công' })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc đã hết hạn' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const { refreshToken } = dto

    const user = await this.authService.verifyRefreshToken(refreshToken)
    const userNew = {
      id: user.id,
      email: user.email,
    }
    const tokens = await this.authService.generateTokens(userNew) // tạo access/refresh token

    return responseObject(1, 'Cấp lại token thành công', 'Auth/RefreshToken', tokens)
  }

  @MessagePattern('validate-token')
  async handleValidateToken(payload: { token: string }) {
    return await this.authService.validateToken(payload.token)
  }
}
