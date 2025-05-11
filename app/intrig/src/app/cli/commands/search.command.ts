import {Command, CommandRunner} from "nest-commander";
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
        return { name: title, value: desc.id };
      });

      // Prompt user to select one
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'id',
          message: 'Select a resource:',
          choices,
          pageSize: size,
        },
      ]);

      console.log(`Selected resource ID: ${answers.id}`);
    } catch (err: any) {
      console.error('Search failed:', err.message || err);
    }
  }
}