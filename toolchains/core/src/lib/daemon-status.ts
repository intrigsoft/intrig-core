import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';
import tcpPortUsed from 'tcp-port-used';
import { spawn } from 'child_process';
import * as http from 'http';
import * as https from 'https';

export interface DiscoveryMetadata {
  projectName: string;
  url: string;
  port: number;
  pid: number;
  timestamp: string;
  path: string;
  type: string;
}

export interface IntrigConfig {
  generator: string;
  sources?: any[];
  [key: string]: any;
}

export function isIntrigProject(): boolean {
  const configPath = path.join(process.cwd(), 'intrig.config.json');
  return fs.existsSync(configPath);
}

export class DaemonManager {
  private projectName: string;
  private discoveryDir: string;
  private metadataFilePath: string;

  constructor() {
    this.projectName = this.getProjectName();
    this.discoveryDir = this.getDiscoveryDir();
    this.metadataFilePath = this.getMetadataFilePath();
  }

  private sanitizeName(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9\-_]/g, '_');
  }

  private getProjectName(): string {
    let projectName = 'intrig-daemon';
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'),
      );
      if (pkg.name) projectName = pkg.name;
    } catch {
      // Silent fallback to default name
    }
    return this.sanitizeName(projectName);
  }

  private getDiscoveryDir(): string {
    const baseDir = os.tmpdir();
    const me = this.sanitizeName(os.userInfo().username);
    return path.join(baseDir, `${me}.intrig`);
  }

  private getMetadataFilePath(): string {
    const rootDir = process.cwd();
    const abs = path.resolve(rootDir);
    const metadataFileName =
      createHash('sha1').update(abs).digest('hex') + '.json';

    return path.join(this.discoveryDir, metadataFileName);
  }

  public getCurrentProjectName(): string {
    return this.projectName;
  }

  public getMetadataPath(): string {
    return this.metadataFilePath;
  }

  public async isRunning(): Promise<boolean> {
    if (!fs.existsSync(this.metadataFilePath)) {
      return false;
    }

    try {
      const metadata = JSON.parse(
        fs.readFileSync(this.metadataFilePath, 'utf-8'),
      ) as DiscoveryMetadata;
      return await tcpPortUsed.check(metadata.port);
    } catch {
      return false;
    }
  }

  public getMetadata(): DiscoveryMetadata | null {
    if (!fs.existsSync(this.metadataFilePath)) {
      return null;
    }

    try {
      return JSON.parse(
        fs.readFileSync(this.metadataFilePath, 'utf-8'),
      ) as DiscoveryMetadata;
    } catch {
      return null;
    }
  }

  private async spawnDaemon(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🚀 Starting Intrig daemon...');

      const child = spawn('intrig', ['daemon', 'up'], {
        stdio: 'inherit',
        detached: true,
      });

      child.on('error', (err) => {
        console.error('❌ Failed to start daemon:', err.message);
        reject(err);
      });

      child.on('exit', (code) => {
        if (code === 0) {
          console.log('✅ Daemon started successfully');
          resolve();
        } else {
          reject(new Error(`Daemon process exited with code ${code}`));
        }
      });

      // Don't wait for the child process to finish
      child.unref();

      // Give some time for the daemon to start
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  }

  private async waitForDaemon(): Promise<DiscoveryMetadata> {
    const maxAttempts = 30; // 30 seconds max wait
    let attempts = 0;

    console.log('⏳ Waiting for daemon to be ready...');

    while (attempts < maxAttempts) {
      if (fs.existsSync(this.metadataFilePath)) {
        try {
          const metadata = JSON.parse(
            fs.readFileSync(this.metadataFilePath, 'utf-8'),
          ) as DiscoveryMetadata;

          // Verify port is actually in use
          const isPortInUse = await tcpPortUsed.check(metadata.port);
          if (isPortInUse) {
            console.log('✅ Daemon is ready');
            return metadata;
          }
        } catch (err) {
          // Continue waiting if file exists but isn't readable yet
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Timeout waiting for daemon to be ready');
  }

  public async ensureDaemonRunning(): Promise<void> {
    // Check if daemon file exists
    if (!fs.existsSync(this.metadataFilePath)) {
      console.log('🔄 Daemon not running, starting it...');

      // Start the daemon
      await this.spawnDaemon();

      // Wait for daemon to be ready
      await this.waitForDaemon();

      return;
    }

    // Read and verify existing daemon
    let metadata: DiscoveryMetadata;
    try {
      metadata = JSON.parse(fs.readFileSync(this.metadataFilePath, 'utf-8'));
    } catch (err) {
      console.log('🔄 Daemon metadata corrupted, restarting...');
      await this.spawnDaemon();
      await this.waitForDaemon();
      return;
    }

    // Check if port is actually in use
    try {
      const isPortInUse = await tcpPortUsed.check(metadata.port);

      if (isPortInUse) {
        console.log('✅ Daemon is already running');
      } else {
        console.log('🔄 Daemon appears stale, restarting...');
        await this.spawnDaemon();
        await this.waitForDaemon();
      }
    } catch (err) {
      console.log('🔄 Failed to check daemon status, restarting...');
      await this.spawnDaemon();
      await this.waitForDaemon();
    }
  }

  private readIntrigConfig(): IntrigConfig | null {
    const configPath = path.join(process.cwd(), 'intrig.config.json');
    if (!fs.existsSync(configPath)) {
      return null;
    }

    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as IntrigConfig;
    } catch {
      return null;
    }
  }

  private checkHashesFileExists(generator: string): boolean {
    const hashesPath = path.join(
      process.cwd(),
      'node_modules',
      '@intrig',
      generator,
      'hashes.json',
    );
    return fs.existsSync(hashesPath);
  }

  private readHashesFile(generator: string): Record<string, string> | null {
    const hashesPath = path.join(
      process.cwd(),
      'node_modules',
      '@intrig',
      generator,
      'hashes.json',
    );
    if (!fs.existsSync(hashesPath)) {
      return null;
    }

    try {
      return JSON.parse(fs.readFileSync(hashesPath, 'utf-8')) as Record<
        string,
        string
      >;
    } catch {
      return null;
    }
  }

  private async callVerifyEndpoint(
    metadata: DiscoveryMetadata,
    hashes: Record<string, string>,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const url = new URL('/api/operations/verify', metadata.url);
      const postData = JSON.stringify(hashes);

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => {
        resolve(false);
      });

      req.write(postData);
      req.end();
    });
  }

  private async invalidateViteCache(): Promise<void> {
    try {
      console.log('🗑️  Invalidating Vite cache...');

      // Remove Vite cache directory
      const viteCacheDir = path.join(process.cwd(), 'node_modules', '.vite');
      if (fs.existsSync(viteCacheDir)) {
        fs.rmSync(viteCacheDir, { recursive: true, force: true });
        console.log('✅ Vite cache directory removed');
      }

      // Also clear any potential cache in the insight app
      const insightCacheDir = path.join(
        process.cwd(),
        'app',
        'insight',
        'node_modules',
        '.vite',
      );
      if (fs.existsSync(insightCacheDir)) {
        fs.rmSync(insightCacheDir, { recursive: true, force: true });
        console.log('✅ Insight Vite cache directory removed');
      }
    } catch (err) {
      console.warn(
        '⚠️  Failed to invalidate Vite cache:',
        (err as Error).message,
      );
    }
  }

  private async callGenerateEndpoint(
    metadata: DiscoveryMetadata,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔄 Starting code generation...');

      const url = new URL('/api/operations/generate', metadata.url);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      };

      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        if (res.statusCode !== 200) {
          reject(
            new Error(`Generate endpoint returned status ${res.statusCode}`),
          );
          return;
        }

        let buffer = '';

        res.on('data', (chunk) => {
          buffer += chunk.toString();

          // Process complete SSE messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.substring(6));

                // Log progress events
                if (eventData.type === 'status') {
                  console.log(
                    `📦 ${eventData.step}: ${eventData.sourceId || 'global'}`,
                  );
                } else if (eventData.type === 'done') {
                  console.log('✅ Code generation completed successfully');
                  this.invalidateViteCache()
                    .then(() => resolve())
                    .catch(() => resolve());
                  return;
                }
              } catch (err) {
                // Ignore malformed JSON in SSE stream
              }
            }
          }
        });

        res.on('end', () => {
          // If we reach here without a 'done' event, consider it successful if no error occurred
          console.log(
            '✅ Code generation stream ended (assuming successful completion)',
          );
          this.invalidateViteCache()
            .then(() => resolve())
            .catch(() => resolve());
        });

        res.on('error', (err) => {
          reject(err);
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.setTimeout(300000); // 5 minute timeout for generation
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Generate request timed out'));
      });

      req.end();
    });
  }

  public async checkHashesAndGenerate(): Promise<void> {
    const config = this.readIntrigConfig();
    if (!config || !config.generator) {
      console.log('⚠️  No generator found in intrig.config.json');
      return;
    }

    const generator = config.generator;
    console.log(`🔍 Checking hashes for generator: ${generator}`);

    // First check: Does hashes.json file exist?
    if (!this.checkHashesFileExists(generator)) {
      console.log('❌ Hashes file not found, triggering generation...');
      const metadata = this.getMetadata();
      if (metadata) {
        await this.callGenerateEndpoint(metadata);
      } else {
        console.log(
          '⚠️  No daemon metadata available, cannot trigger generation',
        );
      }
      return;
    }

    // Second check: Read hashes and verify with daemon
    const hashes = this.readHashesFile(generator);
    if (!hashes) {
      console.log('❌ Could not read hashes file, triggering generation...');
      const metadata = this.getMetadata();
      if (metadata) {
        await this.callGenerateEndpoint(metadata);
      } else {
        console.log(
          '⚠️  No daemon metadata available, cannot trigger generation',
        );
      }
      return;
    }

    const metadata = this.getMetadata();
    if (!metadata) {
      console.log(
        '⚠️  No daemon metadata available, skipping hash verification',
      );
      return;
    }

    console.log('📡 Verifying hashes with daemon...');
    const isValid = await this.callVerifyEndpoint(metadata, hashes);

    if (!isValid) {
      console.log('❌ Hash verification failed, triggering generation...');
      await this.callGenerateEndpoint(metadata);
    } else {
      console.log('✅ Hash verification passed, no generation needed');
    }
  }
}

// Legacy function for backward compatibility
export async function ensureDaemonRunning(): Promise<void> {
  const manager = new DaemonManager();
  await manager.ensureDaemonRunning();
}
