import { ResponseDto, PaginationMetaDto } from '../dto/response.dto'

export const responseObject = <T>(
  statusCode: number,
  message?: string | null,
  actionScreen?: string | null,
  data?: T,
  meta?: PaginationMetaDto,
  timestamp?: string,
): ResponseDto<T> => {
  const finalTimestamp = timestamp || getFormattedTimestamp()
  const finalMessage = message ?? 'Thành công'
  const finalActionScreen = actionScreen ?? undefined
  return new ResponseDto(statusCode, finalMessage, finalActionScreen, data, meta, finalTimestamp)
}

function getFormattedTimestamp(): string {
  const date = new Date()
  const vnDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))

  const pad = (n: number) => n.toString().padStart(2, '0')

  const day = pad(vnDate.getDate())
  const month = pad(vnDate.getMonth() + 1) // 0-based
  const year = vnDate.getFullYear()

  const hours = pad(vnDate.getHours())
  const minutes = pad(vnDate.getMinutes())
  const seconds = pad(vnDate.getSeconds())

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}
