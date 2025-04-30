import {Command, CommandRunner} from "nest-commander";
import {ProcessManagerService} from "../process-manager.service";

@Command({name: "init"})
export class InitCommand extends CommandRunner {

  constructor(private pm: ProcessManagerService) {
    super();
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    if (await this.pm.isRunning()) throw new Error("Intrig is already running");
    
    throw new Error("Method not implemented.");
  }
}