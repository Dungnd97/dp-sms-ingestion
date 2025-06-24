import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class TokenDto {
  @IsNotEmpty()
  @ApiPropertyOptional({ example: 'eyasdmksnd' })
  token: string
}
