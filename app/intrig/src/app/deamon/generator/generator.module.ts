import {DynamicModule, Module} from '@nestjs/common';
import {IntrigConfigService} from "../services/intrig-config.service";
import {GeneratorBinding} from "@intrig/common";
import {loadInstalledPlugins} from "../../plugins/plugin-loader";

@Module({})
export class GeneratorModule {
  static register(plugins = loadInstalledPlugins()): DynamicModule {
    const bindingModules = plugins.map(p => p.bindingModule);
    const bindingServices = plugins.map(p => p.bindingService);
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
            try {
              const generator = configService.get().generator;
              const idx = plugins.findIndex(p => p.name === generator);
              return bindings[idx >= 0 ? idx : 0];
            } catch (e) { /* empty */ }
            return bindings[0];
          }
        }
      ],
      exports: [GeneratorBinding]
    };
  }
}
