import { Controller, Get, Req, UseGuards, Query, Post, Body, UnauthorizedException, HttpStatus, Res, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { MailService } from '../../mail/mail.service';
import { responseObject } from '../../common/helpers/response.helper'
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('SSO')
@Controller('sso')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly mailService: MailService) { }

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
      const user = req.user;
      const tokens = await this.authService.generateTokens(user);
      return responseObject(1, 'Success', tokens);
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  @ApiBearerAuth('jwt')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user info' })
  @Get('me')
  getMe(@Req() req) {
    try {
      return responseObject(1, 'Current user info', req.user);
    } catch (error) {
      throw new UnauthorizedException(error.message);
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
      const user = await this.authService.validateToken(token);
      return responseObject(1, 'Validate Token success', user);

    } catch (err) {
      throw new UnauthorizedException(err.message);
    }
  }

  @Post('send')
  async sendEmail(
    @Body()
    body: {
      to: string;
      subject: string;
      content: string;
      isHtml?: boolean;
    },
    @Res() res: Response,
  ) {
    try {
      await this.mailService.sendMail({
        to: body.to,
        subject: body.subject,
        [body.isHtml ? 'html' : 'text']: body.content,
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Email sent successfully',
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to send email',
        error: error.message,
      });
    }
  }
}
