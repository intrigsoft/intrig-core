import {Command, CommandRunner, SubCommand} from "nest-commander";
import {ProcessManagerService} from "../process-manager.service";
import * as inquirer from 'inquirer';

@SubCommand({
  name: 'add',
  description: 'Add a new source',
})
export class SourcesAddCommand extends CommandRunner {

  constructor(private pm: ProcessManagerService) {
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
          validate: (v) =>
            v.startsWith('http') ? true : 'Must be a valid HTTP URL',
        },
      ]);
      specUrl = ans.specUrl;
    }

    //TODO call add function.
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

    //TODO call list function.
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