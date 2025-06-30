import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsNotEmpty, IsString, Matches, MinLength, ValidateNested } from 'class-validator'

// DTO phụ cho từng kênh stream
export class channelDTO {
  @ApiProperty({
    description: 'Mã kênh stream',
    example: 'YOUTUBE',
  })
  @IsNotEmpty()
  @IsString()
  channelCode: string

  @ApiProperty({
    description: 'Link tới kênh stream',
    example: 'https://youtube.com/@DungKidzToxic',
  })
  @IsNotEmpty()
  @IsString()
  url: string
}

export class UpdateToStreamerDTO {
  @ApiProperty({
    description: 'Link rút gọn (slug)',
    example: 'DungKidzToxic',
    minLength: 5,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  slugLink: string

  @ApiProperty({
    description: 'Số điện thoại liên hệ',
    example: '0345623358',
    minLength: 10,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @Matches(/^\d+$/, { message: 'Số điện thoại chỉ được chứa số' })
  phoneNumber: string

  @ApiProperty({
    description: 'Mã ngân hàng nhận tiền',
    example: 'VIETCOMBANK',
  })
  @IsNotEmpty()
  @IsString()
  bankCode: string

  @ApiProperty({
    description: 'Số tài khoản ngân hàng',
    example: '0123456789',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+$/, { message: 'Số tài khoản ngân hàng chỉ được chứa số' })
  bankAccountNumber: string

  @ApiProperty({
    description: 'Chủ tài khoản ngân hàng',
    example: 'Nguyễn Văn A',
  })
  @IsNotEmpty()
  @IsString()
  bankAccountHolder: string

  @ApiProperty({
    description: 'Danh sách các kênh stream (mã + link)',
    type: [channelDTO],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => channelDTO)
  channels: channelDTO[]
}
