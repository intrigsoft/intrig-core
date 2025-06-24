import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'cross-spawn';
import { DiscoveryService } from '../discovery/discovery.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

@Injectable()
export class ProcessManagerService {
  private readonly logger = new Logger(ProcessManagerService.name);

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly config: ConfigService,
  ) {}

  async start() {
    if (await this.discovery.isRunning()) {
      this.logger.log('Daemon already running (via discovery)');
      return;
    }

    const child = spawn(
      'intrig',
      ["run"],
      {
        detached: true,
        stdio: 'inherit',
        cwd: this.config.get('rootDir') ?? process.cwd(),
      },
    );
    child.unref();
    this.logger.log(`Spawned daemon (pid=${child.pid})`);
  }

  async stop() {
    const meta = this.discovery.getMetadata();
    if (!meta) {
      this.logger.log('No daemon to stop');
      return;
    }

    try {
      process.kill(meta.pid);
    } catch (err) {
      this.logger.error(`Failed to kill pid=${meta.pid}`, err as any);
    }

    // remove the metadata file
    const filePath = this.discovery.getMetadataFilePath();
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted discovery metadata file (${filePath})`);
      }
    } catch (err) {
      this.logger.error(`Failed to delete metadata file ${filePath}`, err as any);
    }

    this.logger.log(`Stopped daemon pid=${meta.pid}`);
  }

  async restart() {
    await this.stop();
    await this.start();
  }

  async isRunning(): Promise<boolean> {
    return this.discovery.isRunning();
  }

  async getMetadata() {
    if (!(await this.discovery.isRunning())) {
      setTimeout(async () => this.start(), 0);
    }
    return this.discovery.waitForMetadata();
  }
}
