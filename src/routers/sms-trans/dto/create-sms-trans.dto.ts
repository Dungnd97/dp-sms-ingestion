import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsDate, IsNotEmpty, IsString } from 'class-validator'

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
  @Transform(({ value }) => {
    if (typeof value !== 'string') return null

    const [datePart, timePart] = value.trim().split(' ')
    if (!datePart || !timePart) return null

    const [day, month, year] = datePart.split('/')
    if (!day || !month || !year) return null

    const isoString = `${year}-${month}-${day}T${timePart}`
    const date = new Date(isoString)
    return isNaN(date.getTime()) ? null : date
  })
  @IsDate({ message: 'Thời gian không hợp lệ, định dạng đúng: dd/MM/yyyy HH:mm:ss' })
  @IsNotEmpty()
  sendAt: string
}
