import {
    Injectable,
    Logger,
    OnModuleInit,
    OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryMetadata } from './discovery.interface';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class DiscoveryService implements OnModuleInit, OnApplicationShutdown {
    private readonly logger = new Logger(DiscoveryService.name);
    private discoveryDir: string | undefined;
    private filePath?: string;
    private projectName: string | undefined;

    constructor(private readonly config: ConfigService) {}

    private sanitizeName(raw: string): string {
        // allow letters, numbers, dash, underscore; turn everything else into '_'
        return raw.replace(/[^a-zA-Z0-9\-_]/g, '_');
    }

    onModuleInit() {
        // --- 1) figure out projectName from package.json or fallback ---
        let name = 'intrig-deamon';
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

        const baseDir =
            this.config.get<string>('discovery.dir') || os.tmpdir();
        const me = this.sanitizeName(os.userInfo().username);
        this.discoveryDir = path.join(baseDir, `${me}.intrig`);
        if (!fs.existsSync(this.discoveryDir)) {
            fs.mkdirSync(this.discoveryDir, { recursive: true });
        }

        this.logger.log(
            `🔍 DiscoveryService initialized for "${this.projectName}" in ${this.discoveryDir}`,
        );
    }

    /**
     * Call this after your app.listen() so you know the actual port (and URL).
     */
    register(port: number, url?: string) {
        const resolvedUrl =
            url ||
            this.config.get<string>('discovery.url') ||
            `http://localhost:${port}`;

        const filename = `${this.projectName}-${process.pid}.json`;
        this.filePath = path.join(this.discoveryDir ?? '', filename);

        const payload: DiscoveryMetadata = {
            projectName: this.projectName ?? '',
            url: resolvedUrl,
            port,
            pid: process.pid,
            timestamp: new Date().toISOString(),
        };

        fs.writeFileSync(
            this.filePath,
            JSON.stringify(payload, null, 2),
            'utf-8',
        );
        this.logger.log(`✅ Service registered: ${this.filePath}`);
    }

    onApplicationShutdown(signal: string) {
        if (this.filePath && fs.existsSync(this.filePath)) {
            try {
                fs.unlinkSync(this.filePath);
                this.logger.log(`🗑️ Service deregistered (${signal})`);
            } catch (err) {
                this.logger.error(
                    `Failed to delete discovery file`,
                    err as any,
                );
            }
        }
    }
}
