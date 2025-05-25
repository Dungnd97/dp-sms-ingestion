import { ResponseDto, PaginationMetaDto } from '../dto/response.dto';

export const responseObject = <T>(
  statusCode: number,
  message: string,
  data?: T,
  meta?: PaginationMetaDto
): ResponseDto<T> => {
  return new ResponseDto(statusCode, message, data, meta);
};