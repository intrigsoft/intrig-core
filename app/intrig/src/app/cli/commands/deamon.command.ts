import {Command, CommandRunner} from "nest-commander";
import {ProcessManagerService} from "../process-manager.service";
import {Logger} from "@nestjs/common";

@Command({name: "deamon"})
export class DeamonCommand extends CommandRunner {

  private readonly logger: Logger = new Logger(DeamonCommand.name);

  constructor(private readonly pm: ProcessManagerService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const action = passedParams[0]
    switch (action) {
      case 'up':
        await this.pm.start();
        break;
      case 'down':
        await this.pm.stop();
        break;
      case 'restart':
        await this.pm.restart();
        break;
      default:
        this.logger.error(`Usage: deamon [up|down|restart]`)
    }
  }
}