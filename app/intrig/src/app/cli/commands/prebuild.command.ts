import {Command, CommandRunner} from "nest-commander";
import {ProcessManagerService} from "../process-manager.service";
import {LazyPluginService} from "../../plugins/lazy-plugin.service";
import path from "path";
import {ConfigService} from "@nestjs/config";

@Command({name: "prebuild", description: "Prebuild."})
export class PrebuildCommand extends CommandRunner {

  constructor(private pm: ProcessManagerService,
              private config: ConfigService,
              private lazyPluginService: LazyPluginService
              ) {
    super();
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {

    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      throw new Error("No metadata found");
    }

    const plugin = await this.lazyPluginService.getPlugin();
    await plugin.preBuild?.({
      rootDir: this.config.get('rootDir') ?? process.cwd(),
      buildDir: this.config.get("generatedDir") ?? path.resolve(process.cwd(), ".intrig", "generated")
    })
  }
}