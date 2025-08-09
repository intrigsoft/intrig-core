import {Command, CommandRunner, SubCommand} from "nest-commander";
import {ProcessManagerService} from "../process-manager.service";

@SubCommand({name: 'up', description: 'Start the deamon.'})
export class UpSubCommand extends CommandRunner {
  constructor(private readonly pm: ProcessManagerService) {
    super();
  }

  async run(): Promise<void> {
    const isRunning = await this.pm.isRunning();
    if (isRunning) {
      console.log('✓ Daemon is already running');
      return;
    }
    
    console.log('Starting daemon...');
    await this.pm.start();
    console.log('✓ Daemon started successfully');
  }
}

@SubCommand({name: 'down', description: 'Stop the deamon.'})
export class DownSubCommand extends CommandRunner {
  constructor(private readonly pm: ProcessManagerService) {
    super();
  }

  async run(): Promise<void> {
    const isRunning = await this.pm.isRunning();
    if (!isRunning) {
      console.log('✓ Daemon is not running');
      return;
    }
    
    console.log('Stopping daemon...');
    await this.pm.stop();
    console.log('✓ Daemon stopped successfully');
  }
}

@SubCommand({name: 'restart', description: 'Restart the deamon.'})
export class RestartSubCommand extends CommandRunner {
  constructor(private readonly pm: ProcessManagerService) {
    super();
  }

  async run(): Promise<void> {
    console.log('Restarting daemon...');
    await this.pm.restart();
    console.log('✓ Daemon restarted successfully');
  }
}

@SubCommand({name: 'status', description: 'Check the deamon status.'})
export class StatusSubCommand extends CommandRunner {
  constructor(private readonly pm: ProcessManagerService) {
    super();
  }

  async run(): Promise<void> {
    const isRunning = await this.pm.isRunning();
    const status = isRunning ? '✓ Daemon is running' : '✗ Daemon is not running';
    console.log(status);
  }
}


@Command({
  name: "deamon",
  description: "Deamon related operations.",
  subCommands: [
    UpSubCommand,
    DownSubCommand,
    RestartSubCommand,
    StatusSubCommand
  ]
})
export class DeamonCommand extends CommandRunner {
  async run(passedParams: string[]): Promise<void> {
    this.command.outputHelp();
  }
}