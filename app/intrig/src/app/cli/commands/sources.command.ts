import {Command, CommandRunner, Option, SubCommand} from "nest-commander";
import {ProcessManagerService} from "../process-manager.service";
import inquirer from 'inquirer';
import {HttpService} from '@nestjs/axios'
import {lastValueFrom} from "rxjs";
import chalk from 'chalk';
import {LazyPluginService} from "../../plugins/lazy-plugin.service";
import {ConfigService} from '@nestjs/config';

interface SourcesAddOptions {
  id?: string;
}

@SubCommand({
  name: 'add',
  description: 'Add a new source',
})
export class SourcesAddCommand extends CommandRunner {

  constructor(
    private pm: ProcessManagerService,
    private httpService: HttpService,
    private lazyPluginService: LazyPluginService,
    private configService: ConfigService
  ) {
    super();
  }

  @Option({
    flags: '--id <id>',
    description: 'Specify source ID directly (letters/numbers/-/_)',
  })
  parseIdOption(val: string): string {
    return val;
  }

  override async run(passedParams: string[], options?: SourcesAddOptions): Promise<void> {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      console.error(chalk.red.bold('Error:'), chalk.red('No metadata found.'));
      process.exit(1);
    }

    let specUrl = passedParams[0];
    if (!specUrl) {
      const { specUrl: ansUrl } = await inquirer.prompt<{
        specUrl: string;
      }>([
        {
          type: 'input',
          name: 'specUrl',
          message: chalk.yellow('Enter the URL of your OpenAPI/Swagger spec:'),
          validate: (v: string) =>
            v.startsWith('http') || 'Must be a valid HTTP URL',
        },
      ]);
      specUrl = ansUrl;
    }

    // 3) Transform endpoint
    const transformUrl = `${metadata.url}/api/config/sources/transform`;
    console.log(chalk.gray(`\n→ Sending transform request to ${transformUrl}`));
    const { data: source } = await lastValueFrom(
      this.httpService.post(transformUrl, { specUrl })
    );

    // 4) Show raw JSON (optional)
    console.log(chalk.blue('\nRaw source object:'));
    console.log(chalk.blue(JSON.stringify(source, null, 2)));

    // 5) Pretty-print details
    console.log(chalk.bold.cyan('\nSource details:'));
    console.log(
      `${chalk.green('Name:')}    ${chalk.white(source.name ?? 'N/A')}`
    );
    console.log(
      `${chalk.green('Spec:')}    ${chalk.white(source.specUrl ?? 'N/A')}`
    );

    // 6) Get ID from option or prompt
    let id: string;
    if (options?.id) {
      // Validate the provided ID
      if (!/^[\w-]+$/.test(options.id)) {
        console.error(chalk.red.bold('Error:'), chalk.red('ID must contain only letters, numbers, hyphens, or underscores'));
        process.exit(1);
      }
      id = options.id;
      console.log(chalk.blue(`ℹ️  Using provided ID: ${id}`));
    } else {
      const { id: promptedId } = await inquirer.prompt<{ id: string }>([
        {
          type: 'input',
          name: 'id',
          message: chalk.yellow(
            'Enter an ID for this source (letters/numbers/-/_):'
          ),
          validate: (v: string) =>
            /^[\w-]+$/.test(v) ||
            'ID must contain only letters, numbers, hyphens, or underscores',
        },
      ]);
      id = promptedId;
    }
    source.id = id;

    // 7) Add endpoint
    const addUrl = `${metadata.url}/api/config/sources/add`;
    const spinner = chalk.green('✔');
    console.log(chalk.gray(`\n→ Adding source at ${addUrl}`));
    const { data: addRes } = await lastValueFrom(
      this.httpService.post(addUrl, source, {
        headers: { 'Content-Type': 'application/json' },
      })
    );

    // 8) Final output
    console.log(chalk.green.bold(`\n${spinner} Source "${id}" added!`));
    console.log(chalk.whiteBright('Response:'), chalk.white(JSON.stringify(addRes)));

    // 9) Call plugin addSource lifecycle method if available
    try {
      const plugin = await this.lazyPluginService.getPlugin();
      if (plugin.addSource && typeof plugin.addSource === 'function') {
        const rootDir = this.configService.get<string>('rootDir') ?? process.cwd();
        await plugin.addSource({
          options: {}, // generatorOptions would be set here if available
          rootDir: rootDir,
          source: source,
          serverUrl: source.serverUrl
        });
        console.log(chalk.gray('✔ Plugin addSource lifecycle method executed'));
      }
    } catch (error: any) {
      console.log(chalk.yellow('⚠️  Warning: Failed to execute plugin addSource lifecycle method:'), error?.message);
      // Don't fail the command - lifecycle methods are optional
    }
  }
}

@SubCommand({
  name: 'ls',
  description: 'List all sources',
})
export class SourceListCommand extends CommandRunner {
  constructor(private pm: ProcessManagerService, private httpService: HttpService) {
    super();
  }
  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    // 1) Get metadata
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      console.error(chalk.red.bold('Error:'), chalk.red('No metadata found.'));
      process.exit(1);
    }

    // 2) Fetch list
    const listUrl = `${metadata.url}/api/config/sources/list`;
    const { data: sources } = await lastValueFrom(
      this.httpService.get(listUrl, {
        headers: { 'Accept': 'application/json' },
      }),
    );

    // 3) Handle empty
    if (!Array.isArray(sources) || sources.length === 0) {
      console.log(chalk.yellow('No sources found.'));
      return;
    }

    // 4) Pretty‐print
    console.log(chalk.bold.cyan('\nAvailable sources:'));
    sources.forEach((src: any) => {
      console.log(
        `${chalk.green(src.id)}  ${chalk.white(src.name ?? 'N/A')}  →  ${chalk.magenta(
          src.specUrl ?? 'N/A',
        )}`,
      );
    });
  }
}

interface SourcesRemoveOptions {
  id?: string;
  yes?: boolean;
}

@SubCommand({
  name: 'rm',
  description: 'Remove a source',
})
export class SourceRemoveCommand extends CommandRunner {

  constructor(
    private pm: ProcessManagerService,
    private httpService: HttpService,
    private lazyPluginService: LazyPluginService,
    private configService: ConfigService
  ) {
    super();
  }

  @Option({
    flags: '--id <id>',
    description: 'Specify source ID to remove directly',
  })
  parseIdOption(val: string): string {
    return val;
  }

  @Option({
    flags: '-y, --yes',
    description: 'Skip confirmation prompt',
  })
  parseYesOption(): boolean {
    return true;
  }

  override async run(passedParams: string[], options?: SourcesRemoveOptions): Promise<void> {
    // 1) fetch metadata
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      console.error(chalk.red.bold('Error:'), chalk.red('No metadata found.'));
      process.exit(1);
    }

    // 2) fetch list of sources
    const listUrl = `${metadata.url}/api/config/sources/list`;
    const { data: sources } = await lastValueFrom(
      this.httpService.get(listUrl, { headers: { Accept: 'application/json' } }),
    );

    if (!Array.isArray(sources) || sources.length === 0) {
      console.log(chalk.yellow('No sources found.'));
      return;
    }

    // 3) Get source ID from option or prompt
    let id: string;
    if (options?.id) {
      // Validate the ID exists in sources
      const sourceExists = sources.some((src: any) => src.id === options.id);
      if (!sourceExists) {
        console.error(chalk.red.bold('Error:'), chalk.red(`Source with ID "${options.id}" not found.`));
        console.log(chalk.yellow('Available sources:'));
        sources.forEach((src: any) => {
          console.log(`  - ${src.id}`);
        });
        process.exit(1);
      }
      id = options.id;
      console.log(chalk.blue(`ℹ️  Using provided ID: ${id}`));
    } else {
      const choices = sources.map((src: any) => ({
        name: `${src.id} — ${src.name ?? 'N/A'} (${src.specUrl})`,
        value: src.id,
      }));
      const { id: promptedId } = await inquirer.prompt<{ id: string }>([
        {
          type: 'list',
          name: 'id',
          message: chalk.yellow('Select a source to remove:'),
          choices,
        },
      ]);
      id = promptedId;
    }

    // Store the source details before deletion for lifecycle method
    const selectedSource = sources.find((src: any) => src.id === id);

    // 4) Confirm deletion (skip if --yes flag is set)
    if (!options?.yes) {
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
          type: 'confirm',
          name: 'confirm',
          message: chalk.red(`Are you sure you want to delete "${id}"?`),
          default: false,
        },
      ]);
      if (!confirm) {
        console.log(chalk.gray('Aborted.'));
        return;
      }
    } else {
      console.log(chalk.blue(`ℹ️  Skipping confirmation (--yes flag set)`));
    }

    // 5) call DELETE /remove/:id
    const removeUrl = `${metadata.url}/api/config/sources/remove/${encodeURIComponent(id)}`;
    console.log(chalk.gray(`\n→ Sending DELETE to ${removeUrl}`));
    await lastValueFrom(this.httpService.delete(removeUrl));

    // 6) success
    console.log(chalk.green.bold(`\n✔ Source "${id}" removed!`));

    // 7) Call plugin removeSource lifecycle method if available
    try {
      const plugin = await this.lazyPluginService.getPlugin();
      if (plugin.removeSource && typeof plugin.removeSource === 'function' && selectedSource) {
        const rootDir = this.configService.get<string>('rootDir') ?? process.cwd();
        await plugin.removeSource({
          options: {}, // generatorOptions would be set here if available
          rootDir: rootDir,
          source: selectedSource,
          serverUrl: selectedSource.serverUrl
        });
        console.log(chalk.gray('✔ Plugin removeSource lifecycle method executed'));
      }
    } catch (error: any) {
      console.log(chalk.yellow('⚠️  Warning: Failed to execute plugin removeSource lifecycle method:'), error?.message);
      // Don't fail the command - lifecycle methods are optional
    }
  }
}

@Command({
  name: 'sources',
  description: 'Sources management',
  subCommands: [
    SourcesAddCommand,
    SourceListCommand,
    SourceRemoveCommand,
  ]
})
export class SourcesCommand extends CommandRunner {
  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    this.command.outputHelp();
  }
}