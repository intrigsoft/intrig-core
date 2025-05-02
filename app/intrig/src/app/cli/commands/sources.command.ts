import {Command, CommandRunner, SubCommand} from "nest-commander";
import {ProcessManagerService} from "../process-manager.service";
import inquirer from 'inquirer';
import {HttpService} from '@nestjs/axios'
import {lastValueFrom} from "rxjs";
import {Logger} from "@nestjs/common";

const logger: Logger = new Logger('SourcesCommand');

@SubCommand({
  name: 'add',
  description: 'Add a new source',
})
export class SourcesAddCommand extends CommandRunner {

  constructor(private pm: ProcessManagerService, private httpService: HttpService) {
    super();
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    let metadata = await this.pm.getMetadata();
    if (!metadata) {
      throw new Error("No metadata found");
    }

    let specUrl = passedParams[0];
    if (!specUrl) {
      const ans = await inquirer.prompt<{ specUrl: string }>([
        {
          type: 'input',
          name: 'specUrl',
          message: 'Enter the URL of your OpenAPI/Swagger spec:',
          validate: (v: any) =>
            v.startsWith('http') ? true : 'Must be a valid HTTP URL',
        },
      ]);
      specUrl = ans.specUrl;
    }

    let host = metadata.url;
    let url = `${host}/api/config/sources/transform`;
    logger.debug(`Sending request to ${url} with specUrl=${specUrl}`);
    let response = await lastValueFrom(this.httpService.post(url, {
      specUrl
    }));

    const source = response.data;

    console.log(source)

    console.log('\nSource details:');
    console.log(`Name: ${source.name || 'N/A'}`);
    console.log(`Spec URL: ${source.specUrl || 'N/A'}`);

    const ans = await inquirer.prompt<{ id: string }>([
      {
        type: 'input',
        name: 'id',
        message: 'Enter an ID for this source (used as directory name):',
        validate: (v: string) => {
          if (!v.match(/^[a-zA-Z0-9\-_]+$/)) {
            return 'ID must contain only letters, numbers, hyphens, and underscores';
          }
          return true;
        },
      },
    ]);

    source.id = ans.id;
    url = `${host}/api/config/sources/add`;
    let addResponse = await lastValueFrom(this.httpService.post(url, source, {
      headers: {
        'Content-Type': 'application/json',
      },
    }));
    console.log(addResponse.data);
    console.log(`\nSource "${ans.id}" added successfully!`);
  }
}

@SubCommand({
  name: 'ls',
  description: 'List all sources',
})
export class SourceListCommand extends CommandRunner {
  constructor(private pm: ProcessManagerService) {
    super();
  }
  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    let metadata = await this.pm.getMetadata();
    if (!metadata) {
      throw new Error("No metadata found");
    }


  }
}

@SubCommand({
  name: 'rm',
  description: 'Remove a source',
})
export class SourceRemoveCommand extends CommandRunner {

  constructor(private pm: ProcessManagerService) {
    super();
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    let metadata = await this.pm.getMetadata();
    if (!metadata) {
      throw new Error("No metadata found");
    }

    //TODO call remove function.
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