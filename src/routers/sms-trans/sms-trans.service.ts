import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { PostgresService } from 'src/database/postgres.service'
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
    await this.historyTrans(content, sender, sendAt)

    const resultConfig = await this.checkApiKeyValid(apiKey)
    if (!resultConfig) {
      throw new UnauthorizedException('API key not valid')
    }
    console.log(resultConfig)
    return this.returnMessage(1, 'Thời gian xác thực đã hết hạn. Vui lòng thực hiện đăng ký lại')
  }

  private async checkApiKeyValid(apiKey: string): Promise<{ data: any }> {
    try {
      const [result] = await this.postgresService.execute<{ id: string; orgCode: string }>(
        'SELECT id, orgCode FROM dp_config WHERE id = $1 LIMIT 1',
        [apiKey],
      )
      console.log(result)
      return result // Trả về user đầu tiên tìm thấy
    } catch (error) {
      this.logger.error(`FKhông thể lấy được cấu hình theo API key  ${apiKey}`, error.stack)
      throw new UnauthorizedException('Có lỗi xảy ra trong quá trình thực hiện. Vui lòng thử lại sau')
    }
  }

  private async insertUser(email: string, name: string): Promise<{ id: string; email: string; name: string }> {
    const id = uuidv4()
    await this.postgresService.execute(
      `
      INSERT INTO sys_user (id, email, name, status, type, created_at, updated_at)
      VALUES ($1, $2, $3, 'active', 'user', NOW(), NOW())
      `,
      [id, email, name],
    )
    return { id, email, name }
  }

  private async historyTrans(content: string, sender: string, senderAt: string): Promise<boolean> {
    try {
      await this.postgresService.execute(
        `
      INSERT INTO dp_sms_ingestion_trans_his (id, created_at, updated_at, content, sender, send_at)
      VALUES ($1, NOW(), NOW(), $2, $3, $4)
      `,
        [uuidv4(), content, sender, senderAt],
      )
      return true
    } catch (error) {
      this.logger.error(`Không thể ghi nhận lịch sử`, error.stack)
      throw new UnauthorizedException('Có lỗi xảy ra trong quá trình thực hiện. Vui lòng thử lại sau')
    }
  }
}
