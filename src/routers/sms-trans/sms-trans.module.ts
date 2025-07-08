import { Module } from '@nestjs/common';
import { SmsTransService } from './sms-trans.service';
import { SmsTransController } from './sms-trans.controller';

@Module({
  controllers: [SmsTransController],
  providers: [SmsTransService],
})
export class SmsTransModule {}
