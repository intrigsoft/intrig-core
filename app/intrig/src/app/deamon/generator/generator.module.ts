import {DynamicModule, Module} from '@nestjs/common';
import {IntrigConfigService} from "../services/intrig-config.service";
import {IntrigReactBindingService} from "@intrig/react-binding";
import {IntrigNextBindingService} from "@intrig/next-binding";
import {GeneratorBinding} from "@intrig/common";

@Module({})
export class GeneratorModule {
  static register(): DynamicModule {
    return {
      module: GeneratorModule,
      imports: [IntrigConfigService],
      providers: [
        IntrigReactBindingService,
        IntrigNextBindingService,
        {
          provide: GeneratorBinding,
          inject: [IntrigConfigService, IntrigReactBindingService, IntrigNextBindingService],
          useFactory: (configService: IntrigConfigService, reactBinding: IntrigReactBindingService, nextBinding: IntrigNextBindingService): GeneratorBinding => {
            switch (configService.get().generator) {
              case "react":
                return reactBinding;
              case "next":
                return nextBinding;
              default:
                throw new Error("Unknown generator");
            }
          }
        }
      ],
      exports: [GeneratorBinding]
    };
  }
}
