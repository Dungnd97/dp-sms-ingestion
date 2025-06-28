import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { UpdateToStreamerDTO } from './dto/update-to-streamer'
import { PostgresService } from 'src/database/postgres.service'

@Injectable()
export class StreamerService {
  private readonly logger = new Logger(StreamerService.name)

  constructor(private readonly postgresService: PostgresService) {}

  private returnMessage = (status: number, message: string, actionScreen?: string) => ({
    status,
    message,
    actionScreen,
  })

  async updateToSteamer(
    updateToStreamerDto: UpdateToStreamerDTO,
    userInfo: any,
  ): Promise<{ status: number; message: string; actionScreen?: string }> {
    if (!userInfo || !userInfo.id) {
      throw new UnauthorizedException('Không tìm thấy thông tin người dùng')
    }

    const { slugLink, phoneNumber, bankCode, bankAccountNumber, bankAccountHolder, channels } = updateToStreamerDto
    const streamerId = userInfo.id
    const queries: { sql: string; params?: any[]; returnResult?: boolean }[] = []

    const [streamerInfo] = await this.postgresService.execute<{ id: string }>(
      'SELECT sys_user_id FROM sys_streamer WHERE slug_link = $1',
      [slugLink],
    )

    if (streamerInfo) {
      return this.returnMessage(0, 'slugLink trùng. Vui lòng nhập slugLink khác.')
    }

    queries.push({
      sql: `
      INSERT INTO sys_streamer (
        sys_user_id,
        slug_link,
        phone_number,
        dim_bank_code,
        bank_account_number,
        bank_account_holder,
        created_at,
        updated_at,
        status,
        commission_donate
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), 'ACTIVE', 0.1)
       RETURNING sys_user_id
    `,
      params: [streamerId, slugLink, phoneNumber, bankCode, bankAccountNumber, bankAccountHolder],
      returnResult: true,
    })

    for (const channel of channels) {
      const { channelCode, url } = channel
      queries.push({
        sql: `
      INSERT INTO sys_streamer_channel (
        sys_user_id, dim_channel_code, url
      ) VALUES ($1, $2, $3)
      ON CONFLICT (sys_user_id, dim_channel_code) DO UPDATE
      SET url = EXCLUDED.url
    `,
        params: [streamerId, channelCode, url],
      })
    }

    try {
      await this.postgresService.executeInTransaction(queries)
      return this.returnMessage(1, 'Bạn đã ký kết hợp đồng thành công.')
    } catch (error) {
      return this.returnMessage(0, 'Bạn ký kết hợp đồng không thành công.')
    }
  }

  async getInfoStreamer(amount: number, slugLink?: string, id?: string): Promise<{ streamerInfo: any }> {
    try {
      if (!slugLink && !id) {
        throw new BadRequestException('Tham số không hợp lệ')
      }

      const [streamerInfo] = await this.postgresService.execute<{
        slugLink: string
        sys_user_id: string
        commission_donate: number
        path_url_music: string
        path_url_icon: string
      }>(
        `
    SELECT sys_user_id, slug_link, commission_donate, path_url_music, path_url_icon
    FROM sys_streamer
    WHERE ($1::text IS NULL OR slug_link = $1)
      AND ($2::text IS NULL OR sys_user_id = $2)
    LIMIT 1
    `,
        [slugLink ?? null, id ?? null],
      )

      if (!streamerInfo) {
        throw new UnauthorizedException('Không có thông tin của streamer này')
      }

      const [streamerConfigDonate] = await this.postgresService.execute<{
        sys_user_id: string
        path_url_music: string
        path_url_icon: string
      }>(
        `
    SELECT sys_user_id, path_url_music, path_url_icon
    FROM sys_streamer_config_donate
    WHERE sys_user_id= $1 AND donate_from <= $2::numeric AND donate_to > $2::numeric
    LIMIT 1
    `,
        [streamerInfo.sys_user_id, amount],
      )

      // Merge nếu có config donate
      const streamerInfoNew = streamerConfigDonate
        ? {
            ...streamerInfo,
            path_url_music: streamerConfigDonate.path_url_music,
            path_url_icon: streamerConfigDonate.path_url_icon,
          }
        : streamerInfo

      return streamerInfoNew
    } catch (error) {
      this.logger.error(
        `Lấy thông tin streamer không thành công với slugLink: ${slugLink || 'null'} , id: ${id || 'null'}`,
        error.stack,
      )
      throw error
    }
  }
}
