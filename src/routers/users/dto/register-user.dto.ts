import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterUserDto {
  @ApiPropertyOptional({ example: 'Email' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: 'password' })
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).*/, {
    message: 'Password must contain at least 1 uppercase, 1 lowercase and 1 number'
  })
  password: string;

  @ApiPropertyOptional({ example: 'confirmPassword' })
  @IsString()
  confirmPassword: string;
}