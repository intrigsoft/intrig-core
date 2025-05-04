import {Command, CommandRunner, SubCommand} from "nest-commander";
import {ProcessManagerService} from "../process-manager.service";

@SubCommand({name: 'up', description: 'Start the deamon.'})
export class UpSubCommand extends CommandRunner {
  constructor(private readonly pm: ProcessManagerService) {
    super();
  }

  async run(): Promise<void> {
    await this.pm.start();
  }
}

@SubCommand({name: 'down', description: 'Stop the deamon.'})
export class DownSubCommand extends CommandRunner {
  constructor(private readonly pm: ProcessManagerService) {
    super();
  }

  async run(): Promise<void> {
    await this.pm.stop();
  }
}

@SubCommand({name: 'restart', description: 'Restart the deamon.'})
export class RestartSubCommand extends CommandRunner {
  constructor(private readonly pm: ProcessManagerService) {
    super();
  }

  async run(): Promise<void> {
    await this.pm.restart();
  }
}

@SubCommand({name: 'status', description: 'Check the deamon status.'})
export class StatusSubCommand extends CommandRunner {
  constructor(private readonly pm: ProcessManagerService) {
    super();
  }

  async run(): Promise<void> {
    const isRunning = await this.pm.isRunning();
    console.log(`Daemon is ${isRunning ? 'running' : 'not running'}`);
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