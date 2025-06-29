import {DynamicModule, Module} from '@nestjs/common';
import {IntrigConfigService} from "../services/intrig-config.service";
import {GeneratorBinding} from "@intrig/common";
import {loadInstalledPlugins, LoadedPlugin} from "../../plugins/plugin-loader";

@Module({})
export class GeneratorModule {
  static register(plugins: LoadedPlugin[] = loadInstalledPlugins()): DynamicModule {
    const bindingModules = plugins.map(p => p.plugin.bindingModule);
    const bindingServices = plugins.map(p => p.plugin.bindingService);
    return {
      module: GeneratorModule,
      imports: [...bindingModules],
      providers: [
        IntrigConfigService,
        ...bindingServices,
        {
          provide: GeneratorBinding,
          inject: [IntrigConfigService, ...bindingServices],
          useFactory: (configService: IntrigConfigService, ...bindings: GeneratorBinding[]): GeneratorBinding => {
            const generator = configService.get().generator;
            const matches = plugins.filter(p => p.config?.type === 'generator' && (p.plugin.name === generator || p.config?.for === generator));
            if (matches.length > 1) {
              throw new Error(`Generator plugin conflict for "${generator}"`);
            }
            if (matches.length === 0) {
              throw new Error(`Generator binding not found for "${generator}"`);
            }
            const idx = plugins.indexOf(matches[0]);
            return bindings[idx];
          }
        }
      ],
      exports: [GeneratorBinding]
    };
  }
}
