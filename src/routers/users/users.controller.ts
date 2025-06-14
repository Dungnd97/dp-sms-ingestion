import { Body, Controller, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { responseObject } from '../../common/helpers/response.helper'
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }
  
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
      required: ['email','password','confirmPassword'],
    },
  })
  async register(@Body() body: { email: string; password: string,confirmPassword: string }) {
    try {
      const result = await this.usersService.registerUser(body.email, body.password, body.confirmPassword);
      return responseObject(result.status, result.message);
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
