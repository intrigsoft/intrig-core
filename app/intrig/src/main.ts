/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */
import {CommandFactory} from "nest-commander";
import { AppModule } from './app/app.module';
import { NestFactory } from "@nestjs/core";
import {Logger, ValidationPipe} from "@nestjs/common";
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
import {AddressInfo} from "node:net";
import {DiscoveryService} from "./app/discovery/discovery.service";

async function bootstrapDeamon() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('Auto-generated API docs')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get(`/${globalPrefix}/swagger.json`, (_req: any, res: any) => {
    res.type('application/json').send(document);
  });
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 0;
  const server = await app.listen(port);
  const actualPort = (server.address() as AddressInfo).port;
  const url = `http://localhost:${actualPort}`;

  const discovery = app.get(DiscoveryService);
  discovery.register(actualPort, url);

  Logger.log(`🚀 Application is running on: ${url}/${globalPrefix}`);
  Logger.log(`📖 Swagger docs available at: ${url}/docs`);
}

async function bootstrap() {
  const cmd = process.argv[2];
  if (cmd === 'run') {
    await bootstrapDeamon()
  } else {
    await CommandFactory.run(AppModule);
  }
}

bootstrap();
