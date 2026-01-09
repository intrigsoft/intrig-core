/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */
import {CommandFactory} from "nest-commander";
import { AppModule } from './app/app.module';
import { InitModule } from './app/init-cli/init.module';
import { NestFactory } from "@nestjs/core";
import {Logger, ValidationPipe} from "@nestjs/common";
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
import {AddressInfo} from "node:net";
import {DiscoveryService} from "./app/discovery/discovery.service";
import {IntrigConfigService} from "./app/daemon/services/intrig-config.service";

const logger = new Logger('Main');


async function bootstrapDaemon() {
  const app = await NestFactory.create(AppModule, {
    // logger: ['error'],
  });
  app.enableShutdownHooks();
  app.enableCors();

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Intrig Daemon API')
    .setDescription('API for intrig daemon integrations')
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

  // Handle crashes and cleanup discovery file
  let isCleaningUp = false;
  const cleanupAndExit = (reason: string, err?: Error) => {
    if (isCleaningUp) return; // Prevent re-entrancy
    isCleaningUp = true;

    logger?.error(`Daemon crash (${reason}):`, err?.stack || err);

    // Synchronously cleanup discovery file - don't rely on async app.close()
    try {
      discovery.onApplicationShutdown(reason);
    } catch (cleanupErr) {
      logger?.error('Failed to cleanup discovery file:', cleanupErr);
    }

    // Give logs time to flush, then exit
    setImmediate(() => process.exit(1));
  };

  process.on('uncaughtException', (err) => {
    cleanupAndExit('uncaughtException', err);
  });

  process.on('unhandledRejection', (reason: any) => {
    cleanupAndExit('unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
  });

  logger?.log(`🚀 Application is running on: ${url}/${globalPrefix}`);
  logger?.log(`📖 Swagger docs available at: ${url}/docs`);
}

async function bootstrap() {
  const cmd = process.argv[2];
  if (cmd === 'run') {
    await bootstrapDaemon()
  } else if (cmd === "mcp") {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false
    });
    
    // Enable shutdown hooks for proper cleanup
    app.enableShutdownHooks();
    
    // Initialize the application - this triggers onApplicationBootstrap
    await app.init();
    
    // Keep the process alive by preventing exit
    process.stdin.resume();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await app.close();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await app.close();
      process.exit(0);
    });
  } else {
    // Catch truly unhandled errors too
    process.on('uncaughtException', (err) => {
      // Print full stack if possible
      console.error('\n[uncaughtException]');
      console.error(err?.stack || err);
      // give stdout/stderr a tick to flush
      setImmediate(() => process.exit(1));
    });
    process.on('unhandledRejection', (reason: any) => {
      console.error('\n[unhandledRejection]');
      console.error(reason?.stack || reason);
      setImmediate(() => process.exit(1));
    });

    try {
      // Load init module for init command, otherwise use AppModule
      const moduleToLoad = cmd === 'init' ? InitModule : AppModule;
      
      await CommandFactory.run(moduleToLoad, {
        logger: ['error'],
        errorHandler(err: any) {
          console.error('\n[cli error]');

          if (err.code === 'commander.help') {
            return process.exit(0);
          }
          const code = typeof err.exitCode === 'number' ? err.exitCode : 1;
          console.error(err)
          setImmediate(() => process.exit(code));
        }
      });
      process.exit(0);
    } catch (e: any) {
      console.error('\n[catch]');
      console.error(e?.stack || e);
      if (logger) {
        logger.error('Failed to run command', e);
      }
    }
  }
}

bootstrap();
