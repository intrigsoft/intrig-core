import {Command, CommandRunner} from "nest-commander";

/**
 * This is a shadow command that does nothing.
 * It's used to initialize the project.'
 */
@Command({name: "init", description: "Initialize Intrig"})
export class InitCommand extends CommandRunner {

  constructor() {
    super();
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    process.exit(0);
  }
}