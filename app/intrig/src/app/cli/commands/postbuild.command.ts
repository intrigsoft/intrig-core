import {Command, CommandRunner} from "nest-commander";
import {ProcessManagerService} from "../process-manager.service";
import {LazyPluginService} from "../../plugins/lazy-plugin.service";
import {ConfigService} from "@nestjs/config";
import {IntrigConfigService} from "../../daemon/services/intrig-config.service";
import path from "path";

@Command({name: "postbuild", description: "Postbuild."})
export class PostbuildCommand extends CommandRunner {

  constructor(private pm: ProcessManagerService,
              private config: ConfigService,
              private lazyPluginService: LazyPluginService,
              private intrigConfigService: IntrigConfigService) {
    super();
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      throw new Error("No metadata found");
    }

    const plugin = await this.lazyPluginService.getPlugin();
    const intrigConfig = this.intrigConfigService.get();
    await plugin.postBuild?.({
      options: intrigConfig.generatorOptions || {},
      rootDir: this.config.get('rootDir') ?? process.cwd(),
      buildDir: this.config.get("generatedDir") ?? path.resolve(process.cwd(), ".intrig", "generated")
    })
  }
}