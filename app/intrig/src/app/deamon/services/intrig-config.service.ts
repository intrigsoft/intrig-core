import {Injectable, Logger} from '@nestjs/common';
import {join} from "path";
import {readFileSync, writeFileSync} from "fs";
import {IntrigConfig, IntrigSourceConfig} from "@intrig/common";
import {ConfigService} from "@nestjs/config";

@Injectable()
export class IntrigConfigService {
  private readonly configPath: string;
  private readonly logger = new Logger(IntrigConfigService.name);

  constructor(config: ConfigService) {
    this.configPath = join(config.get('rootDir')!, 'intrig.config.json');
    // this.logger.log(`Initializing config service with path: ${this.configPath}`);
    // if (!existsSync(this.configPath)) {
    //   this.logger.error(`Configuration file not found at: ${this.configPath}`);
    //   throw new Error('Current directory is not an intrig-enabled project directory');
    // }
    // this.logger.log('Config service initialized successfully');
  }

  private readConfig(): IntrigConfig {
    let content: string | undefined;
    try {
      content = readFileSync(this.configPath, 'utf-8');
    } catch (e) {
      this.logger.error(`Failed to read config file: ${this.configPath}`, e);
      console.error(e);
      throw e
    }
    return JSON.parse(content) as IntrigConfig;
  }

  private writeConfig(config: IntrigConfig): void {
    writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  add(source: IntrigSourceConfig) {
    this.logger.log(`Adding new source with ID: ${source.id}`);
    const config = this.readConfig();
    config.sources = config.sources || [];
    config.sources.push(source);
    this.writeConfig(config);
    this.logger.log(`Source ${source.id} added successfully`);
  }

  remove(id: string) {
    this.logger.log(`Removing source with ID: ${id}`);
    const config = this.readConfig();
    const initialLength = config.sources?.length || 0;
    config.sources = (config.sources || []).filter(source => source.id !== id);
    this.writeConfig(config);
    if (config.sources.length === initialLength) {
      this.logger.warn(`Source ${id} not found`);
    } else {
      this.logger.log(`Source ${id} removed successfully`);
    }
  }

  list(): IntrigSourceConfig[] {
    this.logger.log('Retrieving list of sources');
    const config = this.readConfig();
    const sources = config.sources || [];
    this.logger.log(`Found ${sources.length} sources`);
    return sources;
  }

  get(): IntrigConfig {
    return this.readConfig();
  }
}
