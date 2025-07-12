import { Module } from '@nestjs/common'
import { JobTransService } from './job-trans.service'
import { JobTransController } from './job-trans.controller'
import { ScheduleModule } from '@nestjs/schedule'

@Module({
  imports: [
    ScheduleModule.forRoot(), // BẮT BUỘC để kích hoạt Cron jobs
  ],
  controllers: [JobTransController],
  providers: [JobTransService],
})
export class JobTransModule {}
