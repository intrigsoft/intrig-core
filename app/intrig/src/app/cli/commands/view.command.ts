
import {Command, CommandRunner} from "nest-commander";
import {HttpService} from "@nestjs/axios";
import {lastValueFrom} from "rxjs";
import chalk from "chalk";
import {ProcessManagerService} from "../process-manager.service";
import {Tab} from "common";
import inquirer from "inquirer";

@Command({ name: 'view', description: 'View resource details by ID' })
export class ViewCommand extends CommandRunner {

  constructor(private pm: ProcessManagerService, private httpService: HttpService) {
    super();
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      console.error(chalk.red.bold('Error:'), chalk.red('No metadata found.'));
      process.exit(1);
    }

    const id = passedParams[0];
    if (!id) {
      console.error(chalk.red.bold('Error:'), chalk.red('Resource ID is required.'));
      process.exit(1);
    }

    try {
      // First, fetch the resource to identify its type
      const initialEndpoint = `/api/data/get/${id}`;
      console.log(chalk.gray(`\n→ Fetching resource details from ${metadata.url}${initialEndpoint}`));
      
      const initialResponse = await lastValueFrom(
        this.httpService.get(`${metadata.url}${initialEndpoint}`, { 
          headers: { Accept: 'application/json' } 
        }),
      );

      const initialResource = initialResponse.data;
      
      if (!initialResource) {
        console.error(chalk.red.bold('Error:'), chalk.red(`Resource with ID ${id} not found.`));
        process.exit(1);
      }
      
      // Extract the type from the resource or prompt user to select
      let resourceType = initialResource.type || '';
      
      // If type is not present or not recognized, prompt the user to select
      if (!resourceType || !['schema', 'endpoint'].includes(resourceType)) {
        const typeChoices = [
          { name: 'Schema', value: 'schema' },
          { name: 'Endpoint', value: 'endpoint' },
          { name: 'General Resource', value: 'resource' }
        ];
        
        const typeAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'type',
            message: 'Select resource type:',
            choices: typeChoices,
          },
        ]);
        
        resourceType = typeAnswer.type;
      }
      
      // Fetch detailed data based on the identified or selected type
      let detailedEndpoint = initialEndpoint; // Default to the same endpoint
      let detailedResource = initialResource;
      
      if (resourceType === 'schema') {
        detailedEndpoint = `/api/data/get/schema/${id}`;
      } else if (resourceType === 'endpoint') {
        detailedEndpoint = `/api/data/get/endpoint/${id}`;
      }
      
      // Only fetch detailed data if a specific endpoint is needed
      if (detailedEndpoint !== initialEndpoint) {
        console.log(chalk.gray(`\n→ Fetching detailed ${resourceType} data from ${metadata.url}${detailedEndpoint}`));
        
        try {
          const detailedResponse = await lastValueFrom(
            this.httpService.get(`${metadata.url}${detailedEndpoint}`, { 
              headers: { Accept: 'application/json' } 
            }),
          );
          
          detailedResource = detailedResponse.data;
        } catch (err) {
          console.log(chalk.yellow(`\n⚠ Could not fetch detailed ${resourceType} data. Using basic resource information.`));
        }
      }
      
      // Check if the resource has tabs
      const tabs = detailedResource?.tabs as Tab[] | undefined;
      
      if (tabs && tabs.length > 0) {
        // Create choices for tab selection
        const tabChoices = tabs.map(tab => ({
          name: tab.name,
          value: tab
        }));
        
        // Prompt user to select a tab
        const tabAnswer = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedTab',
            message: 'Select a tab to view:',
            choices: tabChoices,
          },
        ]);
        
        const selectedTab = tabAnswer.selectedTab as Tab;
        
        // Display the selected tab content
        console.log(chalk.green.bold(`\n✔ ${selectedTab.name} Content:`));
        console.log(selectedTab.content);
      } else {
        // If no tabs are available, display the entire resource
        console.log(chalk.green.bold(`\n✔ ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Details:`));
        console.log(JSON.stringify(detailedResource, null, 2));
      }
      
      // Record this view in last visited items if applicable
      if (initialResource.id && (resourceType === 'schema' || resourceType === 'endpoint')) {
        try {
          await lastValueFrom(
            this.httpService.post(`${metadata.url}/api/data/visit`, {
              id: initialResource.id,
              type: resourceType,
              source: initialResource.source || '',
              name: initialResource.name || initialResource.id
            })
          );
        } catch (err) {
          // Silently ignore errors when recording visit
        }
      }
    } catch (err: any) {
      console.error(chalk.red.bold('Error:'), chalk.red(err.message || 'Failed to fetch resource details.'));
      process.exit(1);
    }
  }
}