import { Expose, Type } from 'class-transformer';

export class PaginationMetaDto {
  @Expose()
  page: number;

  @Expose()
  limit: number;

  @Expose()
  totalItems: number;

  @Expose()
  totalPages: number;

  constructor(page: number, limit: number, totalItems: number) {
    this.page = page;
    this.limit = limit;
    this.totalItems = totalItems;
    this.totalPages = Math.ceil(totalItems / limit);
  }
}

export class ResponseDto<T> {
  @Expose()
  status: number;

  @Expose()
  message: string;

  @Expose()
  data?: T | null = null;

  @Expose()
  @Type(() => PaginationMetaDto)
  meta: PaginationMetaDto | null = null // Mặc định là null

  constructor(status: number, message: string, data: T | null = null, meta: PaginationMetaDto | null = null) {
    this.status = status;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }
}
