import { Module, Global } from '@nestjs/common'
import { PostgresService } from './postgres.service'

@Global() // Đánh dấu Global để auto-import toàn cục
@Module({
  providers: [PostgresService],
  exports: [PostgresService], // Cho phép module khác sử dụng
})
export class DatabaseModule {}
