/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory, HttpAdapterHost } from '@nestjs/core'
import { AppModule } from './app.module'
import { BadRequestException, Logger, ValidationError } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: process.env.TCP_HOST || '127.0.0.1',
      port: parseInt(process.env.TCP_PORT || '8004'),
    },
  })

  await app.startAllMicroservices()
  app.enableCors({
    origin: '*', // hoặc ['http://localhost:8000'] nếu muốn giới hạn
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
  })

  const httpAdapterHost = app.get(HttpAdapterHost)
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost))

  app.setGlobalPrefix('api/auth')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        return new BadRequestException(errors)
      },
    }),
  )

  const config = new DocumentBuilder()
    .setTitle('API documentation')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'jwt',
    )
    .build()
  const document = SwaggerModule.createDocument(app, config)
  app.use('/api-json', (req, res) => res.json(document))
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })

  const port = process.env.PORT ?? 3004
  await app.listen(port)

  const logger = new Logger('Bootstrap')
  logger.log(`🚀 Server is running at: http://localhost:${port}`)
}
bootstrap()
