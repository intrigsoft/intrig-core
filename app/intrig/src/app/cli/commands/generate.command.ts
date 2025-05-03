import { Command, CommandRunner } from 'nest-commander';
import { ProcessManagerService } from '../process-manager.service';
import { HttpService } from '@nestjs/axios';
import chalk from 'chalk';
import { lastValueFrom } from 'rxjs';
import { createParser, EventSourceMessage, ParseError } from 'eventsource-parser';
import ora from 'ora';

@Command({ name: 'generate', description: 'Generate codebase' })
export class GenerateCommand extends CommandRunner {
  constructor(
    private pm: ProcessManagerService,
    private httpService: HttpService,        // ← inject HttpService
  ) {
    super();
  }

  override async run(
    passedParams: string[],
    options?: Record<string, any>,
  ): Promise<void> {
    // 1) fetch metadata
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      console.error(chalk.red.bold('Error:'), chalk.red('No metadata found.'));
      process.exit(1);
    }

    // 2) build URL and log
    const genUrl = `${metadata.url}/api/operations/generate`;
    console.log(chalk.gray(`\n→ Connecting to ${genUrl}\n`));

    // 3) open SSE stream
    const response = await lastValueFrom(
      this.httpService.get(genUrl, { responseType: 'stream' }),
    );
    const stream = response.data as NodeJS.ReadableStream;

    let spinners: Record<string, ora.Ora> = {}
    // 4) set up SSE parser
    const parser = createParser({
      onEvent(event: EventSourceMessage) {
        let { sourceId = 'global', step = 'generate', status } = JSON.parse(event.data);
        const label = `${sourceId} › ${step}`;

        switch (status) {
          case 'started':
            spinners[label] = ora({
              spinner: 'dots',
              color: 'yellow',
              text: label,
              isEnabled: true
            }).start();
            break;
          case 'success':
            spinners[label]?.succeed(label);
            delete spinners[label];
            break;
          case 'error':
            spinners[label]?.fail(label)
            delete spinners[label];
            break;
        }
      },
      onError(err: ParseError) {
        console.error(chalk.red('SSE parse error:'), err);
      },
    });

    // 5) feed chunks into parser
    stream.on('data', (chunk: Buffer) => {
      parser.feed(chunk.toString('utf8'));
    });

    // 6) await end/error
    await new Promise<void>((resolve) => {
      stream.on('end', () => {
        console.log(chalk.green.bold('\n✔ Generation completed.'));
        resolve();
      });
      stream.on('error', (err) => {
        console.error(chalk.red('\nGeneration error:'), err);
        resolve();
      });
    });
  }
}
