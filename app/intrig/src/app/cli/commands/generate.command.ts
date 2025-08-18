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

    // 3) open SSE stream
    const response = await lastValueFrom(
      this.httpService.get(genUrl, { responseType: 'stream' }),
    );
    const stream = response.data as NodeJS.ReadableStream;

    const spinners: Record<string, ora.Ora> = {}

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const $this = this;
    // 4) set up SSE parser
    const parser = createParser({
      onEvent(event: EventSourceMessage) {
        const { sourceId = 'global', step = 'generate', status, info } = JSON.parse(event.data);
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

            if (step === 'finalize') {
              const infoObj = JSON.parse(info ?? "{}");
              $this.printGenerationReport(infoObj);
            }
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

  private printGenerationReport(infoObj: any): void {
    console.log('\n' + chalk.cyan.bold('📊 Generation Report'));
    console.log(chalk.gray('─'.repeat(50)));

    // Print skipped endpoints section
    if (infoObj.skipEndpoints && Object.keys(infoObj.skipEndpoints).length > 0) {
      console.log('\n' + chalk.yellow.bold('⚠️  Skipped Endpoints:'));
      
      for (const [sourceId, skippedEndpoints] of Object.entries(infoObj.skipEndpoints)) {
        console.log(chalk.cyan(`\n  ${sourceId}:`));
        
        (skippedEndpoints as any[]).forEach((item, index) => {
          const isLast = index === (skippedEndpoints as any[]).length - 1;
          const prefix = isLast ? '  └─' : '  ├─';
          console.log(`${prefix} ${chalk.red(item.endpoint)}`);
          console.log(`${isLast ? '    ' : '  │ '} ${chalk.dim('Reason:')} ${chalk.gray(item.reason)}`);
        });
      }
    } else {
      console.log('\n' + chalk.green('✅ No endpoints were skipped'));
    }

    // Print generation statistics section
    if (infoObj.generationStats && Object.keys(infoObj.generationStats).length > 0) {
      console.log('\n' + chalk.blue.bold('📈 Generation Statistics:'));
      
      for (const [sourceId, stats] of Object.entries(infoObj.generationStats)) {
        const sourceStats = stats as any;
        console.log(chalk.cyan(`\n  ${sourceId}:`));
        
        if (sourceStats.counters) {
          const counters = Object.entries(sourceStats.counters);
          counters.forEach(([type, count], index) => {
            const isLast = index === counters.length - 1;
            const prefix = isLast ? '  └─' : '  ├─';
            console.log(`${prefix} ${chalk.white(type)}: ${chalk.green.bold(count)}`);
          });
        }
      }
    }

    console.log('\n' + chalk.gray('─'.repeat(50)));
  }
}
