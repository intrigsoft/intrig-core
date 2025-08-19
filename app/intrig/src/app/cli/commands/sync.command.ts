import {Command, CommandRunner, Option} from "nest-commander";
import { ProcessManagerService } from "../process-manager.service";
import chalk from 'chalk';
import {lastValueFrom, Subject, Subscription} from "rxjs";
import {HttpService} from "@nestjs/axios";
import {createParser, EventSourceMessage, ParseError} from 'eventsource-parser';
import ora from 'ora';
import inquirer from "inquirer";
import {OperationsService} from "../../daemon/services/operations.service";
import {SyncEventContext} from "common";

@Command({ name: "sync", description: "Sync all entities" })
export class SyncCommand extends CommandRunner {

  constructor(private pm: ProcessManagerService, private httpService: HttpService, private operationsService: OperationsService) {
    super();
  }

  @Option({
    flags: '--all',
    description: 'Bypass source selection and sync all sources',
  })
  parseAllOption(): boolean {
    return true;
  }

  @Option({
    flags: '--id [id]',
    description: 'Bypass source selection and use the given id as the source to sync',
  })
  parseIdOption(val: string): string {
    return val;
  }

  @Option({
    flags: '--ci',
    description: 'Run in CI mode (do not auto-start the Intrig daemon; run in-process)'
  })
  parseCiOption(val: boolean): boolean {
    return val;
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    if (options?.ci) {
      await this.runInProcessNoDaemon(options);
      return;
    }

    // 1) fetch metadata
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      console.error(chalk.red.bold('Error:'), chalk.red('No metadata found.'));
      process.exit(1);
    }

    // 2) fetch current sources
    const listUrl = `${metadata.url}/api/config/sources/list`;
    const { data: sources } = await lastValueFrom(
      this.httpService.get(listUrl, { headers: { Accept: 'application/json' } }),
    );

    // 3) determine source id to sync (from flags or prompt)
    let id = '';

    // Check if --id flag was provided
    if (options?.id) {
      id = options.id;
    }
    // Check if --all flag was provided
    else if (options?.all) {
      id = ''; // Empty id means all sources
    }
    // If no flags provided, prompt user to select
    else {
      const choices = [
        { name: '→ All sources', value: '' },
        ...sources.map((s: any) => ({
          name: `→ ${s.id} (${s.name ?? 'N/A'})`,
          value: s.id,
        })),
      ];
      const result = await inquirer.prompt<{ id: string }>([
        {
          type: 'list',
          name: 'id',
          message: chalk.yellow('Which source would you like to sync?'),
          choices,
        },
      ]);
      id = result.id;
    }

    // 4) build sync URL with optional query parameter
    let syncUrl = `${metadata.url}/api/operations/sync`;
    if (id) {
      syncUrl += `?id=${encodeURIComponent(id)}`;
    }

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

  private async runInProcessNoDaemon(options: Record<string, any>) {
    // Determine id from flags; in CI mode default to all when not provided
    let id = '';
    if (options?.id) {
      id = options.id;
    } else if (options?.all) {
      id = '';
    } else {
      // default to all in CI to avoid interactive prompts
      id = '';
    }

    // Set up events Subject and context
    const events$ = new Subject<MessageEvent>();
    const ctx = new SyncEventContext(events$);

    const spinners: Record<string, ora.Ora> = {};
    const sub: Subscription = events$.subscribe({
      next: (m) => {
        const ev: any = m.data as any;
        // If it's a status event, it will have status/step fields
        const sourceId = ev.sourceId ?? 'global';
        const step = ev.step ?? 'sync';
        const status = ev.status as string | undefined;
        const label = `${sourceId} › ${step}`;

        if (!status) {
          // probably a done event; ignore spinner handling
          return;
        }

        switch (status) {
          case 'started': {
            if (!spinners[label]) {
              spinners[label] = ora({
                spinner: 'dots',
                color: 'yellow',
                text: label,
                isEnabled: true,
              }).start();
            } else {
              spinners[label].start();
              spinners[label].text = label;
            }
            break;
          }
          case 'success': {
            spinners[label]?.succeed(label);
            delete spinners[label];
            break;
          }
          case 'error': {
            spinners[label]?.fail(label);
            delete spinners[label];
            if (ev.error) {
              console.error(chalk.red('Details:'), ev.error);
            }
            break;
          }
        }
      },
      error: (err) => {
        console.error(chalk.red('Event stream error:'), err);
      },
      complete: () => {
        for (const key of Object.keys(spinners)) {
          spinners[key]?.stop();
          delete spinners[key];
        }
        console.log(chalk.green.bold('\n✔ Sync completed.'));
      },
    });

    try {
      await this.operationsService.sync(ctx, id || undefined);
      // complete if not already completed by ctx.done
      events$.complete();
    } catch (e) {
      for (const key of Object.keys(spinners)) {
        spinners[key]?.fail(key);
        delete spinners[key];
      }
      console.error(chalk.red('\nSync error:'), e);
      throw e;
    } finally {
      sub.unsubscribe();
    }
  }
}