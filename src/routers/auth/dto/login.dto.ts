import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class LoginDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsEmail()
  @MaxLength(255)
  @IsNotEmpty()
  email: string

  @ApiPropertyOptional({ example: '123456aBA' })
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @IsNotEmpty()
  @Matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).*/, {
    message: 'Password must contain at least 1 uppercase, 1 lowercase and 1 number',
  })
  password: string
}
