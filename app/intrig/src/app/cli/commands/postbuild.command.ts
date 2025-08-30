import {Command, CommandRunner} from "nest-commander";
import {ProcessManagerService} from "../process-manager.service";
import {Inject} from "@nestjs/common";
import {INTRIG_PLUGIN} from "../../plugins/plugin.module";
import type { IntrigGeneratorPlugin } from "@intrig/plugin-sdk";

@Command({name: "postbuild", description: "Postbuild."})
export class PostbuildCommand extends CommandRunner {

  constructor(private pm: ProcessManagerService,
              @Inject(INTRIG_PLUGIN) private plugin: IntrigGeneratorPlugin) {
    super();
  }

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    const metadata = await this.pm.getMetadata();
    if (!metadata) {
      throw new Error("No metadata found");
    }

    await this.plugin.postBuild?.()
  }
}