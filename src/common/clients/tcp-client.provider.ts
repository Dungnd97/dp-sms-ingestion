import { ClientProxyFactory, Transport } from '@nestjs/microservices'
import { LoggingClientProxy } from './logging-client-proxy'

export const createTcpClient = (host: string, port: number) => {
  const rawClient = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host, port },
  })

  console.log(`🛰️  Created TCP client for ${host}:${port}`)

  return new LoggingClientProxy(rawClient)
}
