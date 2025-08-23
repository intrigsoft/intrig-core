import { Injectable } from '@nestjs/common';
import type { IntrigGeneratorPlugin } from '@intrig/plugin-sdk';

@Injectable()
export class PluginRegistryService {
  private pluginInstance: IntrigGeneratorPlugin | null = null;
  private pluginName: string | null = null;

  register(name: string, plugin: IntrigGeneratorPlugin) {
    this.pluginName = name;
    this.pluginInstance = plugin;
  }

  get name(): string | null {
    return this.pluginName;
  }

  get instance(): IntrigGeneratorPlugin | null {
    return this.pluginInstance;
  }
}
