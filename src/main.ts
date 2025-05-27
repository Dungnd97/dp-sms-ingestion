/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory, HttpAdapterHost } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {

  const app = await NestFactory.create(AppModule)
  
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  app.setGlobalPrefix('api/auth');

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
    ).build();
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 3000
  await app.listen(port)

  const logger = new Logger('Bootstrap')
  logger.log(`🚀 Server is running at: http://localhost:${port}`)
}
bootstrap()
