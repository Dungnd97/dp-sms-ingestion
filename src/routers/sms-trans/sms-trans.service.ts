import { Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common'
import { PostgresService } from '../../database/postgres.service'
import { extractSmsInfo } from '../../utils/extractSmsInfo'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class SmsTransService {
  private readonly logger = new Logger(SmsTransService.name)

  constructor(private readonly postgresService: PostgresService) {}

  private returnMessage = (status: number, message: string, actionScreen?: string) => ({
    status,
    message,
    actionScreen,
  })

  async createUserWithApiKey(
    apiKey: string,
    content: string,
    sender: string,
    sendAt: string,
  ): Promise<{ status: number; message: string; actionScreen?: string }> {
    // 1. Kiểm tra API key có hợp lệ không
    const resultConfig = await this.checkApiKeyValid(apiKey)
    if (!resultConfig) {
      throw new UnauthorizedException('API key not valid')
    }
    const resultTransHis = await this.historyTrans(content, sender, sendAt)
    await this.insertTrans(content, sender, sendAt, resultConfig.orgCode, resultTransHis.id)
    return this.returnMessage(1, 'Thành công')
  }

  async checkApiKeyValid(apiKey: string): Promise<{ orgCode: string }> {
    try {
      const [result] = await this.postgresService.execute<{ id: string; org_code: string }>(
        'SELECT id, org_code FROM dp_config WHERE id = $1 LIMIT 1',
        [apiKey],
      )
      return result.org_code
    } catch (error) {
      this.logger.error(`Không thể lấy được cấu hình theo API key  ${apiKey}`, error.stack)
      throw new UnauthorizedException('Có lỗi xảy ra trong quá trình thực hiện. Vui lòng thử lại sau')
    }
  }

  async insertTrans(
    content: string,
    sender: string,
    sendAt: any,
    orgCode: string,
    id: string,
  ): Promise<{ id: string }> {
    const smsInfo = extractSmsInfo(content, sender)
    if (!smsInfo) {
      throw new InternalServerErrorException('API key not valid')
    }
    console.log(smsInfo)

    await this.postgresService.execute(
      `
      INSERT INTO dp_sms_ingestion_trans (id, created_at, updated_at, amount, content_key, sender, send_at)
      VALUES ($1, NOW(), NOW(), $2, $3, $4, $5)
      `,
      [id, smsInfo.amount, smsInfo.transactionId, sender, sendAt],
    )
    return { id }
  }

  async historyTrans(content: string, sender: string, senderAt: string): Promise<{ id: string }> {
    try {
      const [result] = await this.postgresService.execute<{ id: string }>(
        `
        INSERT INTO dp_sms_ingestion_trans_his (
            id, created_at, updated_at, content, sender, send_at
        )
        VALUES ($1, NOW(), NOW(), $2, $3, $4)
        RETURNING id
        `,
        [uuidv4(), content, sender, senderAt],
      )
      return {
        id: result.id,
      }
    } catch (error) {
      this.logger.error(`Không thể ghi nhận lịch sử`, error.stack)
      throw new InternalServerErrorException('Có lỗi xảy ra trong quá trình thực hiện. Vui lòng thử lại sau')
    }
  }
}
