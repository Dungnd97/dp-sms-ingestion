import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DatabaseModule } from './database/database.module'
import { ConfigModule } from '@nestjs/config'
import { SmsTransModule } from './routers/sms-trans/sms-trans.module';

@Module({
  imports: [DatabaseModule, ConfigModule.forRoot({ isGlobal: true }), SmsTransModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
