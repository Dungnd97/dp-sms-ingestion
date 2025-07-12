import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DatabaseModule } from './database/database.module'
import { ConfigModule } from '@nestjs/config'
import { SmsTransModule } from './routers/sms-trans/sms-trans.module'
import { JobTransModule } from './routers/job-trans/job-trans.module'
import { ClientProxyModule } from './common/clients/client-proxy.module'

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    SmsTransModule,
    JobTransModule,
    ClientProxyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
