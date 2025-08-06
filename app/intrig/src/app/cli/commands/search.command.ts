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
    defaultValue: false
  })
  parseNoInteractiveOption(val: boolean): boolean {
    return Boolean(val);
  }

  @Option({
    flags: '--option [index]',
    description: 'Select option by index (works with --no-interactive)',
  })
  parseOptionIndexOption(val: string): number {
    return parseInt(val, 10);
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      console.error(chalk.red.bold('Error:'), chalk.red('No metadata found.'));
      process.exit(1);
    }

    const query = passedParams[0] || '';
    const page = 1;
    const size = 20;

    try {
      // Call the search API
      const response = await lastValueFrom(
        this.httpService.get<Page<ResourceDescriptor<any>>>(`${metadata.url}/api/data/search`, {
          params: { query, page, size },
        }),
      );

      const resultPage = response.data;
      if (!resultPage.data.length) {
        console.log('No resources found.');
        return;
      }

      // Build choices for inquirer prompt
      const choices = resultPage.data.map((desc) => {
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

      // Handle non-interactive mode
      if (!options?.interactive) {
        if (!options?.option) {
          console.log('Select a resource.');
          choices.forEach((choice, index) => {
            console.log(` ${index + 1}. ${choice.name}`);
          });
        } else {
          const optionIndex = options.option;
          if (optionIndex < 1 || optionIndex > choices.length) {
            console.error(`Error: Option index out of range. Must be between 1 and ${choices.length}.`);
            process.exit(1);
          }
          
          const selected = choices[optionIndex - 1];
          console.log(`Selected resource: ID: ${selected.value}, Type: ${selected.type}`);
          return;
        }
        
        // If no option index is provided, just exit after displaying options
        return;
      }

      // Interactive mode: prompt user to select one
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
    } catch (err: any) {
      console.error('Search failed:', err.message || err);
    }
  }
}