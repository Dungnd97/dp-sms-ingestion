import { Expose, Type } from 'class-transformer'

export class PaginationMetaDto {
  @Expose()
  page: number

  @Expose()
  limit: number

  @Expose()
  totalItems: number

  @Expose()
  totalPages: number

  constructor(page: number, limit: number, totalItems: number) {
    this.page = page
    this.limit = limit
    this.totalItems = totalItems
    this.totalPages = Math.ceil(totalItems / limit)
  }
}

export class ResponseDto<T> {
  @Expose()
  status: number

  @Expose()
  message?: string | null = null

  @Expose()
  actionScreen?: string | null = null

  @Expose()
  data?: T | null = null

  @Expose()
  @Type(() => PaginationMetaDto)
  meta: PaginationMetaDto | null = null

  @Expose()
  timestamp?: string | null

  constructor(
    status: number,
    message: string | null = null,
    actionScreen: string | null = null,
    data: T | null = null,
    meta: PaginationMetaDto | null = null,
    timestamp: string | null = null,
  ) {
    this.status = status
    this.message = message
    this.actionScreen = actionScreen
    this.data = data
    this.meta = meta
    this.timestamp = timestamp
  }
}
