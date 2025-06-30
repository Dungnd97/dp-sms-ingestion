import { IsOptional, IsInt, Min, IsString, Matches, IsObject } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10

  @ApiPropertyOptional({
    example: 'connectionString:asc',
    description: 'Định dạng: field:asc,field2:desc',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\w+:(asc|desc))(,\w+:(asc|desc))*$/, {
    message: 'Sort must be in the format field:asc,field2:desc',
  })
  sort?: string

  @ApiPropertyOptional({
    example: {
      dbKey: 'mydb',
      username: 'admin',
    },
    description: 'Tìm kiếm động theo các trường trong DTO',
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, string | number>
}
