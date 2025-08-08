import {Command, CommandRunner, Option} from "nest-commander";
import {HttpService} from "@nestjs/axios";
import {lastValueFrom} from "rxjs";
import {Page, ResourceDescriptor} from "common";
import inquirer from "inquirer";
import {ProcessManagerService} from "../process-manager.service";
import chalk from "chalk";

@Command({ name: 'search', description: 'Search for resources'})
export class SearchCommand extends CommandRunner {

  constructor(private pm: ProcessManagerService, private httpService: HttpService) {
    super();
  }

  @Option({
    flags: '--no-interactive',
    description: 'Display options without an interactive prompt',
  })
  parseNoInteractiveOption(val: boolean): boolean {
    return val;
  }

  @Option({
    flags: '--option [index]',
    description: 'Select option by index (works with --no-interactive)',
  })
  parseOptionIndexOption(val: string): number {
    return parseInt(val, 10);
  }

  private async validateMetadata() {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      console.error(chalk.red.bold('Error:'), chalk.red('No metadata found.'));
      process.exit(1);
    }
    return metadata;
  }

  private async fetchSearchResults(metadata: any, query: string, page: number, size: number) {
    try {
      const response = await lastValueFrom(
        this.httpService.get<Page<ResourceDescriptor<any>>>(`${metadata.url}/api/data/search`, {
          params: { query, page, size },
        }),
      );
      
      return response.data;
    } catch (err: any) {
      console.error('Search failed:', err.message || err);
      process.exit(1);
    }
  }

  private buildChoices(resultPage: Page<ResourceDescriptor<any>>) {
    if (!resultPage.data.length) {
      console.log('No resources found.');
      return null;
    }

    return resultPage.data.map((desc) => {
      let title = desc.name;
      if (desc.type === 'rest' && desc.data) {
        const rest = desc.data as any;
        const method = rest.method?.toUpperCase() || '';
        const path = Array.isArray(rest.paths) && rest.paths.length ? rest.paths[0] : '';
        const summary = rest.summary ? ` — ${rest.summary}` : '';
        title = `${method} ${path}${summary}`.trim();
      }
      return { 
        name: title, 
        value: desc.id,
        type: desc.type,
        source: desc.source
      };
    });
  }

  private handleNonInteractiveMode(choices: any[], options?: Record<string, any>) {
    if (!options?.option) {
      console.log('Select a resource.');
      choices.forEach((choice, index) => {
        console.log(` ${index + 1}. ${choice.name}`);
      });
      return null;
    } else {
      const optionIndex = options.option;
      if (optionIndex < 1 || optionIndex > choices.length) {
        console.error(`Error: Option index out of range. Must be between 1 and ${choices.length}.`);
        process.exit(1);
      }
      
      const selected = choices[optionIndex - 1];
      console.log(`Selected resource: ID: ${selected.value}, Type: ${selected.type}`);
      return selected;
    }
  }

  private async handleInteractiveMode(choices: any[], size: number) {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'id',
        message: 'Select a resource:',
        choices,
        pageSize: size,
      },
    ]);

    // Find the selected resource to get its type
    const selectedResource = choices.find(choice => choice.value === answers.id);
    console.log(`Selected resource: ID: ${answers.id}, Type: ${selectedResource?.type}`);
    return selectedResource;
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    try {
      const metadata = await this.validateMetadata();
      
      const query = passedParams[0] || '';
      const page = 1;
      const size = 20;

      const resultPage = await this.fetchSearchResults(metadata, query, page, size);
      
      const choices = this.buildChoices(resultPage);
      if (!choices) return;

      // Handle non-interactive mode
      if (!options?.interactive) {
        this.handleNonInteractiveMode(choices, options);
        return;
      }

      // Interactive mode
      await this.handleInteractiveMode(choices, size);
    } catch (err: any) {
      console.error('Search failed:', err.message || err);
    }
  }
}