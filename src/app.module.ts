import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DatabaseModule } from './database/database.module'
import { MailModule } from './mail/mail.module'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './routers/auth/auth.module'
import { UserModule } from './routers/user/user.module'
import { StreamerModule } from './routers/streamer/streamer.module'

@Module({
  imports: [
    DatabaseModule,
    MailModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    StreamerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
