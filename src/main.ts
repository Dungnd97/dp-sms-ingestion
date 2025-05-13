/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'
import * as dotenv from 'dotenv'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

dotenv.config()
async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api/auth');

  const config = new DocumentBuilder().setTitle('Test').setDescription('Test').setVersion('1.0').build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document)

  const port = process.env.PORT ?? 3000
  await app.listen(port)

  const logger = new Logger('Bootstrap')
  logger.log(`🚀 Server is running at: http://localhost:${port}`)
}
bootstrap()
