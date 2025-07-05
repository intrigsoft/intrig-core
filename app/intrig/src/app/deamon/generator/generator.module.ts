import {DynamicModule, Module} from '@nestjs/common';
import {IntrigConfigService} from "../services/intrig-config.service";
// import {ReactBindingService} from "@intrig/react-binding";
// import {IntrigNextBindingService} from "@intrig/next-binding";
import {GeneratorBinding} from "@intrig/common";
import {loadDynamicModules} from "../../loadDynamicModules";

@Module({})
export class GeneratorModule {
  static async registerAsync(): Promise<DynamicModule> {
    const plugins = await loadDynamicModules();

    return {
      module: GeneratorModule,
      imports: [],
      providers: [
        IntrigConfigService,
        ...plugins.map(a => a.binding),
        {
          provide: GeneratorBinding,
          inject: [IntrigConfigService, ...plugins.map(a => a.binding)],
          useFactory: (configService: IntrigConfigService, ...bindings: GeneratorBinding[]): GeneratorBinding => {
            const generatorBinding = bindings.find(a => a.getLibName() === configService.get().generator) ?? bindings[0];
            if (!generatorBinding) {
              throw new Error(`No generator found for ${configService.get().generator}`);
            }
            return generatorBinding;
          }
        }
      ],
      exports: [GeneratorBinding]
    };
  }
}
