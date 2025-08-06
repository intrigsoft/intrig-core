
import {Command, CommandRunner, Option} from "nest-commander";
import {HttpService} from "@nestjs/axios";
import {lastValueFrom} from "rxjs";
import chalk from "chalk";
import {ProcessManagerService} from "../process-manager.service";
import {DescriptorType, ResourceDescriptor, RestDocumentation, SchemaDocumentation, Tab} from "common";
import inquirer from "inquirer";

@Command({ name: 'view', description: 'View resource details by ID' })
export class ViewCommand extends CommandRunner {

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
    flags: '--type [type]',
    description: 'Resource type (schema or endpoint)',
  })
  parseTypeOption(val: string): string {
    return val;
  }
  
  @Option({
    flags: '--tab-option [index]',
    description: 'Select tab by index (works with --no-interactive)',
  })
  parseTabOptionIndexOption(val: string): number {
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

  private validateId(id: string | undefined): string {
    if (!id) {
      console.error(chalk.red.bold('Error:'), chalk.red('Resource ID is required.'));
      process.exit(1);
    }
    return id;
  }

  private async fetchInitialResource(metadata: any, id: string) {
    const initialEndpoint = `/api/data/get/${id}`;
    console.log(chalk.gray(`\n→ Fetching resource details from ${metadata.url}${initialEndpoint}`));
    
    try {
      const initialResponse = await lastValueFrom(
        this.httpService.get(`${metadata.url}${initialEndpoint}`, { 
          headers: { Accept: 'application/json' } 
        }),
      );

      const initialResource: ResourceDescriptor<any> = initialResponse.data;
      
      if (!initialResource) {
        console.error(chalk.red.bold('Error:'), chalk.red(`Resource with ID ${id} not found.`));
        process.exit(1);
      }

      return { initialResource, initialEndpoint };
    } catch (err: any) {
      console.error(chalk.red.bold('Error:'), chalk.red(err.message || 'Failed to fetch resource details.'));
      process.exit(1);
    }
  }

  private async determineResourceType(initialResource: ResourceDescriptor<any>): Promise<DescriptorType> {
    return initialResource.type || process.exit(1);
  }

  private async fetchDetailedResource(metadata: any, id: string, resourceType: DescriptorType): Promise<SchemaDocumentation | RestDocumentation | undefined> {
    let detailedEndpoint = '';
    
    if (resourceType === 'schema') {
      detailedEndpoint = `/api/data/get/schema/${id}`;
    } else if (resourceType === 'rest') {
      detailedEndpoint = `/api/data/get/endpoint/${id}`;
    }

    try {
      const detailedResponse = await lastValueFrom(
        this.httpService.get(`${metadata.url}${detailedEndpoint}`, {
          headers: { Accept: 'application/json' }
        }),
      );

      return detailedResponse.data as SchemaDocumentation | RestDocumentation | undefined;
    } catch (err) {
      console.log(chalk.yellow(`\n⚠ Could not fetch detailed ${resourceType} data. Using basic resource information.`));
      return undefined;
    }
  }

  private async handleTabSelection(tabs: Tab[], options?: Record<string, any>): Promise<Tab | null> {
    if (!tabs || tabs.length === 0) {
      return null;
    }

    // Create choices for tab selection
    const tabChoices = tabs.map(tab => ({
      name: tab.name,
      value: tab
    }));
    
    let selectedTab: Tab;
    console.log(options)
    // Handle non-interactive mode for tab selection
    if (!options?.interactive) {
      // Check if tab option is provided
      if (options?.tabOption) {
        const tabOptionIndex = options.tabOption;
        if (tabOptionIndex < 1 || tabOptionIndex > tabChoices.length) {
          console.error(`Error: Tab option index out of range. Must be between 1 and ${tabChoices.length}.`);
          process.exit(1);
        }
        
        selectedTab = tabChoices[tabOptionIndex - 1].value;
      } else {
        console.log('\nSelect a tab to view ( use \'--tab-option\' flag. eg: intrig view xxx --type \'Endpoint\' --tab-option 1 )');
        tabChoices.forEach((choice, index) => {
          console.log(` ${index + 1}. ${choice.name}`);
        });
        
        // Exit after displaying options
        process.exit(0);
      }
    } else {
      // Interactive mode: prompt user to select a tab
      const tabAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedTab',
          message: 'Select a tab to view:',
          choices: tabChoices,
        },
      ]);
      
      selectedTab = tabAnswer.selectedTab as Tab;
    }

    return selectedTab;
  }

  private displayResourceContent(selectedTab: Tab | null, resourceType: string, detailedResource: any) {
    if (selectedTab) {
      // Display the selected tab content
      console.log(chalk.green.bold(`\n✔ ${selectedTab.name} Content:`));
      console.log(selectedTab.content);
    } else {
      // If no tabs are available, display the entire resource
      console.log(chalk.green.bold(`\n✔ ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Details:`));
      console.log(JSON.stringify(detailedResource, null, 2));
    }
  }

  private async recordVisit(metadata: any, resource: any, resourceType: string) {
    if (resource.id && (resourceType === 'schema' || resourceType === 'endpoint')) {
      try {
        await lastValueFrom(
          this.httpService.post(`${metadata.url}/api/data/visit`, {
            id: resource.id,
            type: resourceType,
            source: resource.source || '',
            name: resource.name || resource.id
          })
        );
      } catch (err) {
        // Silently ignore errors when recording visit
      }
    }
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    console.log(options)
    try {
      const metadata = await this.validateMetadata();
      const id = this.validateId(passedParams[0]);
      
      const { initialResource } = await this.fetchInitialResource(metadata, id);
      const resourceType = await this.determineResourceType(initialResource);
      const detailedResource = await this.fetchDetailedResource(metadata, id, resourceType);
      
      const tabs = detailedResource?.tabs as Tab[] | [];
      const selectedTab = await this.handleTabSelection(tabs, options);
      
      this.displayResourceContent(selectedTab, resourceType, detailedResource);
      await this.recordVisit(metadata, initialResource, resourceType);
    } catch (err: any) {
      console.error(chalk.red.bold('Error:'), chalk.red(err.message || 'Failed to fetch resource details.'));
      process.exit(1);
    }
  }
}