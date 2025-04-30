import {Command, CommandRunner} from "nest-commander";
import {ProcessManagerService} from "../process-manager.service";

@Command({name: "generate", description: "Generate codebase"})
export class GenerateCommand extends CommandRunner {
  constructor(private pm: ProcessManagerService) {
    super();
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      throw new Error("No metadata found");
    }

    throw new Error("Method not implemented.");
  }

}