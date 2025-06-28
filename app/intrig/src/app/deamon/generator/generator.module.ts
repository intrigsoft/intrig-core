import {DynamicModule, Module} from '@nestjs/common';
import {IntrigConfigService} from "../services/intrig-config.service";
import {GeneratorBinding} from "@intrig/common";
import {BUILTIN_PLUGINS} from "../../plugins/builtin-plugins";

@Module({})
export class GeneratorModule {
  static register(plugins = BUILTIN_PLUGINS): DynamicModule {
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
