/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import {AddressInfo} from "node:net";
import {DiscoveryService} from "./app/discovery/discovery.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
  );

  const swaggerConfig = new DocumentBuilder()
      .setTitle('My API')
      .setDescription('Auto-generated API docs')
      .setVersion('1.0')
      // .addBearerAuth()       // uncomment if you need JWT auth in Swagger
      .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
  let server = await app.listen(0);

  const { port } = server.address() as AddressInfo;
  const url = `http://localhost:${port}`;

  const discovery = app.get(DiscoveryService);
  discovery.register(port, url);

  Logger.log(
      `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(
      `📖 Swagger docs available at: http://localhost:${port}/docs`,
  );
}

bootstrap();
