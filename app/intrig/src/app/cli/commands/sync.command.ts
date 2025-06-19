import {Command, CommandRunner} from "nest-commander";
import { ProcessManagerService } from "../process-manager.service";
import chalk from 'chalk';
import {lastValueFrom} from "rxjs";
import {HttpService} from "@nestjs/axios";
import {createParser, EventSourceMessage, ParseError} from 'eventsource-parser';
import ora from 'ora';
import inquirer from "inquirer";

@Command({ name: "sync", description: "Sync all entities" })
export class SyncCommand extends CommandRunner {

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

    // 2) fetch current sources
    const listUrl = `${metadata.url}/api/config/sources/list`;
    console.log(chalk.gray(`\n→ Fetching sources from ${listUrl}`));
    const { data: sources } = await lastValueFrom(
      this.httpService.get(listUrl, { headers: { Accept: 'application/json' } }),
    );

    // 3) prompt user to select one or all
    const choices = [
      { name: '→ All sources', value: '' },
      ...sources.map((s: any) => ({
        name: `→ ${s.id} (${s.name ?? 'N/A'})`,
        value: s.id,
      })),
    ];
    const { id } = await inquirer.prompt<{ id: string }>([
      {
        type: 'list',
        name: 'id',
        message: chalk.yellow('Which source would you like to sync?'),
        choices,
      },
    ]);

    // 4) build sync URL with optional query parameter
    let syncUrl = `${metadata.url}/api/operations/sync`;
    if (id) {
      syncUrl += `?id=${encodeURIComponent(id)}`;
      console.log(chalk.gray(`\n→ Syncing source: ${id}`));
    } else {
      console.log(chalk.gray('\n→ Syncing all sources'));
    }
    console.log(chalk.gray(`→ Connecting to ${syncUrl}\n`));

    // 5) open SSE stream
    const response = await lastValueFrom(
      this.httpService.get(syncUrl, { responseType: 'stream' }),
    );
    const stream = response.data as NodeJS.ReadableStream;

    const spinners: Record<string, ora.Ora> = {}

    // 6) parser
    const parser = createParser({
      onEvent(event: EventSourceMessage) {
        const { sourceId = 'global', step = 'sync', status } = JSON.parse(event.data);
        const label = `${sourceId} › ${step}`;

        switch (status) {
          case 'started':
            spinners[label] = ora({
              spinner: 'dots',
              color: 'yellow',
              text: label,
              isEnabled: true,
            }).start();
            break;
          case 'success':
            spinners[label]?.succeed();
            delete spinners[label];
            break;
          case 'error':
            spinners[label]?.fail()
            delete spinners[label];
            break;
        }
      },
      onError(err: ParseError) {
        console.error(chalk.red('SSE parse error:'), err);
      },
    });

    // 7) feed stream into parser
    stream.on('data', (chunk: Buffer) => {
      parser.feed(chunk.toString('utf8'));
    });

    // 8) await end
    await new Promise<void>((resolve) => {
      stream.on('end', () => {
        console.log(chalk.green.bold('\n✔ Sync completed.'));
        resolve();
      });
      stream.on('error', (err) => {
        console.error(chalk.red('\nSync error:'), err);
        resolve();
      });
    });
  }

}