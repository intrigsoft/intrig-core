import {Command, CommandRunner} from "nest-commander";
import {ProcessManagerService} from "../process-manager.service";
import {Inject, Logger} from "@nestjs/common";
import {GENERATORS} from "../tokens";
import {GeneratorCli} from "common";
import {PackageJson} from "nx/src/utils/package-json";
import * as fsx from "fs-extra";
import path from "path";
import {ConfigService} from "@nestjs/config";
import {GenerateCommand} from "./generate.command";

@Command({name: "prebuild", description: "Prebuild."})
export class PrebuildCommand extends CommandRunner {

  private readonly logger = new Logger(PrebuildCommand.name);

  constructor(private pm: ProcessManagerService,
              @Inject(GENERATORS) private generators: GeneratorCli[],
              private config: ConfigService,
              private generate: GenerateCommand,
              ) {
    super();
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    await this.generate.run([], {});

    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      throw new Error("No metadata found");
    }

    const packageJsonPath = path.resolve(this.config.get('rootDir') ?? process.cwd(), 'package.json');
    const packageJson: PackageJson = fsx.readJsonSync(packageJsonPath)

    const generator = this.generators.find(generator => generator.match(packageJson));

    if (!generator) {
      this.logger.warn('No generator found for this project')
      return
    }

    await generator.preBuild()
  }
}