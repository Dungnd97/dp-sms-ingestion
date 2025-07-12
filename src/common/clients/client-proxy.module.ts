import { Module, Global } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { createTcpClient } from './tcp-client.provider'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'DONATE_SERVICE',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('DONATE_SERVICE_HOST', 'localhost')
        const port = configService.get<number>('DONATE_SERVICE_PORT', 8001)
        return createTcpClient(host, port)
      },
    },
  ],
  exports: ['DONATE_SERVICE'],
})
export class ClientProxyModule {}
