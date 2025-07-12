import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PostgresService } from '../../database/postgres.service'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

@Injectable()
export class JobTransService {
  private readonly logger = new Logger(JobTransService.name)
  constructor(
    private readonly postgresService: PostgresService,
    @Inject('DONATE_SERVICE') private readonly donateClient: ClientProxy,
  ) {}

  //   @Cron('*/1 * * * *')
  @Cron('*/10 * * * * *')
  async handleJobProcessing() {
    try {
      this.logger.log(`✅ Job bắt đầu chạy`)

      const jobs = await this.postgresService.executeInTransaction([], async (client) => {
        const { rows } = await client.query(`
        UPDATE dp_sms_ingestion_trans AS t
        SET run_number = run_number + 1,
            updated_at = NOW()
        FROM (
          SELECT id
          FROM dp_sms_ingestion_trans
          WHERE status = 'NEW' AND run_number < 5
          ORDER BY created_at
          FOR UPDATE SKIP LOCKED
          LIMIT 2
        ) AS sub
        WHERE t.id = sub.id
        RETURNING t.id, t.amount, t.content_key, t.run_number;
      `)
        return rows
      })

      if (!jobs.length) {
        this.logger.log('Không có record nào để xử lý.')
        return
      }

      await Promise.all(
        jobs.map(async (job: any) => {
          try {
            const result = await firstValueFrom(
              this.donateClient.send('update-trans', {
                id: job.content_key,
                amount: Number(job.amount),
                transSmsId: job.id,
              }),
            )

            const status = result.resultCode === 'SUCCESS' ? 'DONE' : 'DONE_ERROR'

            await this.postgresService.execute(
              `UPDATE dp_sms_ingestion_trans SET status = $2, job_error = $3, updated_at = NOW() WHERE id = $1`,
              [job.id, status, result.resultCode],
            )

            this.logger.log(`✅ Job ${job.id} xử lý xong với status = ${status}`)
          } catch (err) {
            this.logger.error(`❌ Job ${job.id} lỗi khi xử lý`, err)
            await this.postgresService.execute(
              `UPDATE dp_sms_ingestion_trans SET status = $3, job_error = $2, updated_at = NOW() WHERE id = $1`,
              [job.id, err?.message || 'Unknown error', job.run_number < 5 ? 'NEW' : 'ERROR'],
            )
          }
        }),
      )
    } catch (err) {
      this.logger.error('🔥 Lỗi toàn cục job handler:', err)
    }
  }
}
