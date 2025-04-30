import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import glob from 'fast-glob';
import {DiscoveryService} from "../discovery/discovery.service";
import {DiscoveryMetadata} from "../discovery/discovery.interface";

@Injectable()
export class ProcessManagerService {
  private readonly logger = new Logger(ProcessManagerService.name);

  constructor(private readonly discovery: DiscoveryService) {}

  async start() {
    if (await this.discovery.isRunning()) {
      this.logger.log('Daemon already running (via discovery)');
      return;
    }
    // spawn detached daemon: up
    const child = spawn('node', ['dist/main.js', 'daemon','up'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    this.logger.log(`Spawned daemon (pid=${child.pid})`);
  }

  async stop() {
    if (!(await this.discovery.isRunning())) {
      this.logger.log('No daemon to stop');
      return;
    }

    // find all discovery JSON files for this project
    const dirPattern = path.join(this.discovery['discoveryDir']!, `${this.discovery['projectName']}-*.json`);
    const files = await glob(dirPattern);
    for (const file of files) {
      try {
        const meta = JSON.parse(fs.readFileSync(file, 'utf-8'));
        process.kill(meta.pid);
        fs.unlinkSync(file);
        this.logger.log(`Killed daemon pid=${meta.pid}`);
      } catch (err) {
        this.logger.error(`Failed to stop daemon from ${file}`, err as any);
      }
    }
  }

  async restart() {
    await this.stop();
    this.start();
  }

  async isRunning(): Promise<boolean> {
    return this.discovery.isRunning();
  }

  async getMetadata(): Promise<DiscoveryMetadata | null> {
    if (!(await this.discovery.isRunning())) {
      await this.start()
    }
    return Promise.resolve(this.discovery.getMetadata());
  }
}
