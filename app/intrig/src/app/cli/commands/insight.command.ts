import {Command, CommandRunner, Option} from "nest-commander";
import {Logger} from "@nestjs/common";
import {ProcessManagerService} from "../process-manager.service";
import {ConfigService} from "@nestjs/config";
import {GenerateCommand} from "./generate.command";
import * as express from 'express';
import * as path from 'path';
import {fileURLToPath} from "url";

@Command({name: "insight", description: "Start insight server and host insight assets."})
export class InsightCommand extends CommandRunner {

  private readonly logger = new Logger(InsightCommand.name);
  private server: any;

  constructor(private config: ConfigService) {
    super();
  }

  @Option({
    flags: '-p, --path [path]',
    description: 'Path to insight build directory',
  })
  parsePathOption(val: string): string {
    return val;
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {

    const app = express();
    const port = 4300;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Assets are at the same level as main.js
    const insightDistPath = path.join(__dirname, 'assets', 'insight');

    // Serve static files from the insight dist directory
    app.use(express.static(insightDistPath));

    // Fallback to index.html for SPA routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(insightDistPath, 'index.html'));
    });

    this.server = app.listen(port, () => {
      this.logger.log(`Insight server started at http://localhost:${port}`);
      this.logger.log(`Serving insight assets from ${insightDistPath}`);
      this.logger.log(`To use a custom build directory, use: insight --path /path/to/build/dir`);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());

    await new Promise(() => {})
  }

  private shutdown(): void {
    if (this.server) {
      this.logger.log('Shutting down insight server...');
      this.server.close(() => {
        this.logger.log('Insight server has been shut down');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }
}