import { Body, Controller, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common'
import { SmsTransService } from './sms-trans.service'
import { CreateSmsTrans } from './dto/create-sms-trans.dto'

@Controller('sms-trans')
export class SmsTransController {
  constructor(private readonly smsTransService: SmsTransService) {}
  @Post('/send-sms-trans')
  @HttpCode(200)
  async getInfoStreamer(@Body() dto: CreateSmsTrans, @Req() req: Request) {
    const apiKey = req.headers['key']
    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('Missing or invalid API key in header')
    }
    const { content, sender, sendAt } = dto
    const result = await this.smsTransService.createUserWithApiKey(apiKey, content, sender, sendAt)

    return {
      status: 1,
      message: 'Tạo user thành công',
      data: result,
    }
  }
}
