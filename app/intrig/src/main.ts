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
import {IntrigConfigService} from "./app/deamon/services/intrig-config.service";

const isVerbose = process.argv.includes('--verbose');
const logger = new Logger('Main');


async function bootstrapDeamon() {
  const app = await NestFactory.create(AppModule, {
    logger: false
  });
  app.enableShutdownHooks();
  app.enableCors();

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Intrig Deamon API')
    .setDescription('API for intrig deamon integrations')
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
  const intrigConfig = app.get(IntrigConfigService).get();
  discovery.register(actualPort, url, intrigConfig.generator);

  logger?.log(`🚀 Application is running on: ${url}/${globalPrefix}`);
  logger?.log(`📖 Swagger docs available at: ${url}/docs`);
}

async function bootstrap() {
  const cmd = process.argv[2];
  if (cmd === 'run') {
    await bootstrapDeamon()
  } else if (cmd === "mcp") {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false
    });
    await app.init()
    process.stdin.resume();
  } else {
    try {
      await CommandFactory.run(AppModule, {
        logger: false,
        errorHandler(err: any) {
          if (err.code === 'commander.help') {
            return process.exit(0);
          }
          const code = typeof err.exitCode === 'number' ? err.exitCode : 1;
          process.exit(code);
        }
      });
      process.exit(0);
    } catch (e) {
      if (logger) {
        logger.error('Failed to run command', e);
      }
    }
  }
}

bootstrap();
