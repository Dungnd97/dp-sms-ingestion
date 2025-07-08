import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import { ValidationError } from 'class-validator'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: any, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost
    const ctx = host.switchToHttp()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Lỗi không xác định'
    let data: any = null

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const res = exception.getResponse()

      if (typeof res === 'string') {
        message = res
      } else if (typeof res === 'object' && res !== null) {
        const response = res as any

        if (Array.isArray(response.message)) {
          // ✅ Ưu tiên xử lý lỗi ValidationError từ class-validator
          if (
            typeof response.message[0] === 'object' &&
            response.message[0] !== null &&
            'property' in response.message[0] &&
            'constraints' in response.message[0]
          ) {
            message = 'Dữ liệu không hợp lệ'
            data = response.message.map((err: ValidationError) => ({
              key: err.property,
              errors: Object.values(err.constraints || {}),
            }))
          } else {
            // ✅ Trường hợp lỗi dạng string[]
            message = 'Dữ liệu không hợp lệ'
            data = response.message.map((msg: string, idx: number) => ({
              key: `field_${idx}`,
              errors: [msg],
            }))
          }
        } else {
          message = response.message || message
          data = response.data || null
        }
      }
    }

    const responseBody = {
      status,
      message,
      data,
      actionScreen: null,
      meta: null,
      timestamp: new Date().toISOString(),
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, status)
  }
}
