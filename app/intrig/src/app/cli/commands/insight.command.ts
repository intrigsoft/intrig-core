import {Command, CommandRunner, Option} from "nest-commander";
import {Logger} from "@nestjs/common";
import {ConfigService} from "@nestjs/config";
import * as express from 'express';
import {loadInsightAssets} from "../../insight-assets";
import open from 'open'
import * as net from 'net';
import chalk from 'chalk';
import {ProcessManagerService} from "../process-manager.service";
import {HttpService} from "@nestjs/axios";

const SOCIAL_NUMBERS = [12496, 14288, 15472, 14536, 14264, 12496]

@Command({name: "insight", description: "Start insight server and host insight assets."})
export class InsightCommand extends CommandRunner {

  private readonly logger = new Logger(InsightCommand.name);
  private server: any;

  constructor(private pm: ProcessManagerService, private httpService: HttpService) {
    super();
  }

  @Option({
    flags: '-p, --path [path]',
    description: 'Path to custom insight build directory (Note: This option is deprecated as assets are now bundled)',
  })
  parsePathOption(val: string): string {
    this.logger.warn('The --path option is deprecated as insight assets are now bundled into main.js');
    return val;
  }

  @Option({
    flags: '-s, --silent',
    description: 'Start the server without automatically opening the browser',
  })
  parseSilentOption(): boolean {
    return true;
  }

  @Option({
    flags: '--port [port]',
    description: 'Specify the port to run the server on',
  })
  parsePortOption(val: string): number {
    return parseInt(val, 10);
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    await this.validateMetadata();
    const app = express();
    // Get the port from options or find an available one
    const port = await this.findAvailablePort(options?.port);

    // Load insight assets
    let insightAssets;
    try {
      insightAssets = loadInsightAssets();
      this.logger.log('Successfully loaded insight assets');
    } catch (error) {
      this.logger.error(`Failed to load insight assets: ${error.message}`);
      throw error;
    }

    // Set up middleware to serve bundled assets
    app.use(express.static('public'));
    
    // Serve CSS file
    app.get('/assets/index-*.css', (req, res) => {
      res.type('text/css');
      res.send(insightAssets.css);
    });
    
    // Serve JS file
    app.get('/assets/index-*.js', (req, res) => {
      res.type('application/javascript');
      res.send(insightAssets.js);
    });
    
    // Serve favicon
    app.get('/favicon.ico', (req, res) => {
      res.type('image/x-icon');
      res.send(insightAssets.favicon);
    });
    
    // API route - parse JSON body
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/api', async (req, res) => await this.handleApiRequests(req, res));

    // Fallback to index.html for SPA routing
    app.get('*', (req, res) => {
      res.type('text/html');
      res.send(insightAssets.html);
    });

    this.server = app.listen(port, () => {
      // Clear console for a cleaner look
      console.clear();
      
      // Print a decorative header
      console.log('\n' + chalk.bold.cyan('╔════════════════════════════════════════════════════════════╗'));
      console.log(chalk.bold.cyan('║                  ') + chalk.bold.yellow('INTRIG INSIGHT SERVER') + chalk.bold.cyan('                  ║'));
      console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════╝\n'));
      
      // Server URL with prominent styling
      console.log(chalk.bold.green('✓ ') + chalk.bold('Server Status: ') + chalk.green('Running'));
      console.log(chalk.bold.green('✓ ') + chalk.bold('Server URL:    ') + chalk.blue.underline(`http://localhost:${port}`) + '\n');
      
      // Port information with appropriate styling
      console.log(chalk.bold.magenta('ℹ ') + chalk.bold('Port:          ') + chalk.magenta(`${port}`));
      
      // Routes information
      console.log(chalk.bold.magenta('ℹ ') + chalk.bold('Routes:        '));
      console.log(chalk.bold.gray('  ├─ ') + chalk.gray('API    ') + chalk.blue.underline(`http://localhost:${port}/api`));
      console.log(chalk.bold.gray('  └─ ') + chalk.gray('ASSETS ') + chalk.blue.underline(`http://localhost:${port}/assets`));
      
      // Footer with helpful information
      console.log('\n' + chalk.cyan('Press Ctrl+C to stop the server') + '\n');
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());

    // Only open the browser if the silent flag is not set
    if (!options?.silent) {
      await open(`http://localhost:${port}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return new Promise(() => {})
  }

  private shutdown(): void {
    if (this.server) {
      console.log('\n' + chalk.yellow('⏳ ') + chalk.bold('Shutting down insight server...'));
      this.server.close(() => {
        console.log(chalk.green('✓ ') + chalk.bold('Insight server has been shut down successfully'));
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }

  /**
   * Checks if a port is available
   * @param port The port to check
   * @returns Promise that resolves to true if port is available, false otherwise
   */
  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.once('error', () => {
        resolve(false);
      });
      
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      
      server.listen(port);
    });
  }

  private async validateMetadata() {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      console.error(chalk.red.bold('Error:'), chalk.red('No metadata found.'));
      process.exit(1);
    }
    return metadata;
  }
  
  /**
   * Finds an available port based on the following logic:
   * 1. If user specified a port, use it
   * 2. Otherwise try ports from SOCIAL_NUMBERS array
   * 3. If all are unavailable, start from 7007 and go upward
   * @param userPort Optional user-specified port
   * @returns Promise that resolves to an available port
   */

  /**
   * Handles API requests by proxying them to the backend server
   * @param req Express request object
   * @param res Express response object
   */
  private async handleApiRequests(req: express.Request, res: express.Response): Promise<void> {
    try {
      // Get metadata which contains the base URL
      const metadata = await this.validateMetadata();
      const baseUrl = metadata.url;
      
      // Construct the target URL by combining base URL with the request path
      // Keep the original path as-is, the server expects the full path
      const path = req.url;
      
      // Make sure baseUrl doesn't end with a slash and path starts with a slash
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const targetUrl = `${cleanBaseUrl}/api${path}`;
      
      // Create config for the HTTP request
      const config = {
        method: req.method,
        url: targetUrl,
        headers: { ...req.headers },
        data: req.body,
        responseType: 'arraybuffer'
      };
      
      // Remove headers that might cause issues
      delete config.headers.host;
      delete config.headers.connection;
      
      // Forward the request to the backend server
      const response = await this.httpService.axiosRef.request(config);
      
      // Set response headers
      Object.keys(response.headers).forEach(header => {
        res.setHeader(header, response.headers[header]);
      });
      
      // Send the response with the same status code
      res.status(response.status).send(response.data);
    } catch (error) {
      // Handle errors
      this.logger.error(`API proxy error: ${error.message}`);
      
      // If we have a response from the server, forward it
      if (error.response) {
        const { status, headers, data } = error.response;
        
        // Set response headers
        Object.keys(headers).forEach(header => {
          res.setHeader(header, headers[header]);
        });
        
        // Send the error response with the same status code
        res.status(status).send(data);
      } else {
        // If there's no response, send a generic error
        res.status(500).json({ 
          error: 'Internal Server Error',
          message: error.message
        });
      }
    }
  }

  private async findAvailablePort(userPort?: number): Promise<number> {
    // If user specified a port, try to use it
    if (userPort) {
      const isAvailable = await this.isPortAvailable(userPort);
      if (isAvailable) {
        return userPort;
      }
      this.logger.warn(`Port ${userPort} is not available, trying alternative ports`);
    }
    
    // Try ports from SOCIAL_NUMBERS
    for (const port of SOCIAL_NUMBERS) {
      const isAvailable = await this.isPortAvailable(port);
      if (isAvailable) {
        return port;
      }
    }
    
    // If all SOCIAL_NUMBERS ports are unavailable, start from 7007
    let port = 7007;
    while (true) {
      const isAvailable = await this.isPortAvailable(port);
      if (isAvailable) {
        return port;
      }
      port++;
    }
  }
}