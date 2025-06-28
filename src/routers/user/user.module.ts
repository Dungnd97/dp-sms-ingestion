import { Module } from '@nestjs/common'
import { UserService } from './user.service'
import { UserController } from './user.controller'
import { MailModule } from '../../mail/mail.module'
import { JwtModule } from '@nestjs/jwt'

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
  imports: [JwtModule.register({}), MailModule],
})
export class UserModule {}
