import { Module } from '@nestjs/common';
import { CliModule } from './cli/cli.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { DeamonModule } from './deamon/deamon.module';
import {CommonModule} from "common";
import {ConfigModule} from "@nestjs/config";
import configuration from "./config/configuration";
// import {McpModule} from "./mcp/mcp.module";
import { ServeStaticModule } from '@nestjs/serve-static';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DebugController } from './debug/debug.controller';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'dist', 'app', 'intrig', 'assets', 'insight'),
      serveRoot: '/',
      exclude: ['/api/*'],
      serveStaticOptions: {
        index: ['index.html'],
        fallthrough: false,
      },
    }),
    CommonModule,
    CliModule,
    DiscoveryModule,
    DeamonModule,
    // McpModule,
  ],
  controllers: [DebugController],
  providers: [],
})
export class AppModule {}
