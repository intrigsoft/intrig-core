import {Command, CommandRunner, SubCommand} from "nest-commander";
import {ProcessManagerService} from "../process-manager.service";
import inquirer from 'inquirer';
import {HttpService} from '@nestjs/axios'
import {lastValueFrom} from "rxjs";
import chalk from 'chalk';

@SubCommand({
  name: 'add',
  description: 'Add a new source',
})
export class SourcesAddCommand extends CommandRunner {

  constructor(private pm: ProcessManagerService, private httpService: HttpService) {
    super();
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
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

    // 6) Ask for ID
    const { id } = await inquirer.prompt<{ id: string }>([
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

@SubCommand({
  name: 'rm',
  description: 'Remove a source',
})
export class SourceRemoveCommand extends CommandRunner {

  constructor(private pm: ProcessManagerService, private httpService: HttpService) {
    super();
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
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

    // 3) prompt user to choose one
    const choices = sources.map((src: any) => ({
      name: `${src.id} — ${src.name ?? 'N/A'} (${src.specUrl})`,
      value: src.id,
    }));
    const { id } = await inquirer.prompt<{ id: string }>([
      {
        type: 'list',
        name: 'id',
        message: chalk.yellow('Select a source to remove:'),
        choices,
      },
    ]);

    // 4) confirm deletion
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

    // 5) call DELETE /remove/:id
    const removeUrl = `${metadata.url}/api/config/sources/remove/${encodeURIComponent(id)}`;
    console.log(chalk.gray(`\n→ Sending DELETE to ${removeUrl}`));
    await lastValueFrom(this.httpService.delete(removeUrl));

    // 6) success
    console.log(chalk.green.bold(`\n✔ Source "${id}" removed!`));
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