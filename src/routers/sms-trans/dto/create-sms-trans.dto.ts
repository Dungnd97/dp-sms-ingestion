import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class CreateSmsTrans {
  @ApiProperty({
    description: 'content',
    example: 'Nội dung tin nhắn',
  })
  @IsNotEmpty()
  @IsString()
  content: string

  @ApiProperty({
    description: 'Thông tin người gửi',
    example: 'Bidv',
  })
  @IsNotEmpty()
  @IsString()
  sender: string

  @ApiProperty({
    description: 'Thời gian nhận tin nhắn',
    example: '08/07/2025 12:12:00',
  })
  @IsNotEmpty()
  @IsString()
  sendAt: string
}
