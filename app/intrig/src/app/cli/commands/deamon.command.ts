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

@Command({
  name: "deamon",
  description: "Deamon related operations.",
  subCommands: [
    UpSubCommand,
    DownSubCommand,
    RestartSubCommand
  ]
})
export class DeamonCommand extends CommandRunner {
  async run(passedParams: string[]): Promise<void> {
    this.command.outputHelp();
  }
}