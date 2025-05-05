import {
  Injectable,
  Logger,
  OnModuleInit,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryMetadata } from './discovery.interface';
import * as fs from 'fs';
import * as fsx from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';
import tcpPortUsed from 'tcp-port-used';

@Injectable()
export class DiscoveryService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DiscoveryService.name);
  private discoveryDir!: string;
  private projectName!: string;

  onModuleInit() {
    // determine projectName
    let name = 'intrig-daemon';
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'),
      ) as { name?: string };
      if (pkg.name) name = pkg.name;
    } catch {
      this.logger.warn(
        `Could not read package.json in ${process.cwd()}, using "${name}"`,
      );
    }
    this.projectName = this.sanitizeName(name);

    // setup discovery directory
    const baseDir = this.config.get<string>('discovery.dir') || os.tmpdir();
    const me = this.sanitizeName(os.userInfo().username);
    this.discoveryDir = path.join(baseDir, `${me}.intrig`);
    fs.mkdirSync(this.discoveryDir, { recursive: true });

    this.logger.log(
      `🔍 DiscoveryService initialized for "${this.projectName}" in ${this.discoveryDir}`,
    );
  }

  /** deterministic filename based on SHA-1 of absolute rootDir */
  private getMetadataFileName(): string {
    const rootDir = this.config.get<string>('rootDir') ?? process.cwd();
    const abs = path.resolve(rootDir);
    return createHash('sha1').update(abs).digest('hex') + '.json';
  }

  /** full path to the metadata file */
  public getMetadataFilePath(): string {
    return path.join(this.discoveryDir, this.getMetadataFileName());
  }

  register(port: number, url?: string) {
    const resolvedUrl =
      url ||
      this.config.get<string>('discovery.url') ||
      `http://localhost:${port}`;

    const payload: DiscoveryMetadata = {
      projectName: this.projectName,
      url: resolvedUrl,
      port,
      pid: process.pid,
      timestamp: new Date().toISOString(),
      path: this.config.get<string>('rootDir') ?? process.cwd(),
    };

    const filePath = this.getMetadataFilePath();
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    this.logger.log(`✅ Service registered: ${filePath}`);
  }

  async isRunning(): Promise<boolean> {
    const filePath = this.getMetadataFilePath();
    if (!fs.existsSync(filePath)) return false;

    try {
      const meta = JSON.parse(
        fs.readFileSync(filePath, 'utf-8'),
      ) as DiscoveryMetadata;
      return tcpPortUsed.check(meta.port);
    } catch {
      return false;
    }
  }

  getMetadata(): DiscoveryMetadata | null {
    const filePath = this.getMetadataFilePath();
    if (!fs.existsSync(filePath)) {
      this.logger.warn('No discovery metadata file found');
      return null;
    }

    try {
      return JSON.parse(
        fs.readFileSync(filePath, 'utf-8'),
      ) as DiscoveryMetadata;
    } catch (err) {
      this.logger.error('Failed to read or parse discovery metadata', err as any);
      return null;
    }
  }

  async waitForMetadata(): Promise<DiscoveryMetadata> {
    const filePath = this.getMetadataFilePath();

    // if already there
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as DiscoveryMetadata;
    }

    this.logger.log('Waiting for metadata file to appear…');
    return new Promise((resolve, reject) => {
      fs.watchFile(filePath, { interval: 500 }, (curr, prev) => {
        if (curr.size > 0) {
          // stop watching
          fs.unwatchFile(filePath);

          try {
            const meta = JSON.parse(
              fs.readFileSync(filePath, 'utf-8'),
            ) as DiscoveryMetadata;
            resolve(meta);
          } catch (err) {
            reject(err);
          }
        }
      });
    });
  }

  onApplicationShutdown(signal: string) {
    const filePath = this.getMetadataFilePath();
    if (fs.existsSync(filePath)) {
      let metadata: DiscoveryMetadata = fsx.readJsonSync(filePath, 'utf-8');
      if (metadata.pid !== process.pid) {
        return
      }
      try {
        fs.unlinkSync(filePath);
        this.logger.log(`🗑️ Service deregistered (${signal})`);
      } catch (err) {
        this.logger.error('Failed to delete discovery file', err as any);
      }
    }
  }

  private sanitizeName(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9\-_]/g, '_');
  }

  constructor(private readonly config: ConfigService) {}
}
