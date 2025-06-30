import { IsNotEmpty, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ResetPasswordTokenQueryDto {
  @ApiProperty({
    name: 'token',
    required: true,
    description: 'Token được gửi qua email để reset mật khẩu',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty()
  @IsString()
  token: string
}
