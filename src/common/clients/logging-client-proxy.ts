import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices'
import { Observable } from 'rxjs'

export class LoggingClientProxy extends ClientProxy {
  constructor(private readonly client: ClientProxy) {
    super()
  }

  connect(): Promise<any> {
    return this.client.connect()
  }

  close() {
    return this.client.close()
  }

  unwrap<T = any>(): T {
    return this.client as unknown as T
  }

  protected publish(packet: ReadPacket<any>, callback: (packet: WritePacket<any>) => void): () => void {
    return this.client['publish'](packet, callback)
  }

  protected dispatchEvent(packet: ReadPacket<any>): Promise<any> {
    return this.client['dispatchEvent'](packet)
  }

  send<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
    console.log(`📤 [Microservice] send() → Pattern: "${pattern}", Data:`, data)
    return this.client.send(pattern, data)
  }

  emit<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
    console.log(`📢 [Microservice] emit() → Pattern: "${pattern}", Data:`, data)
    return this.client.emit(pattern, data)
  }
}
