import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class RefreshTokenDto {
  @IsNotEmpty()
  @ApiPropertyOptional({ example: 'eyasdmksnd' })
  refreshToken: string
}
