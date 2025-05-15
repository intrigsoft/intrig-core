import {DynamicModule, Module} from '@nestjs/common';
import {IntrigConfigService} from "../services/intrig-config.service";
import {ReactBindingService} from "react-binding";
import {IntrigNextBindingService} from "next-binding";
import {GeneratorBinding} from "common";

@Module({})
export class GeneratorModule {
  static register(): DynamicModule {
    return {
      module: GeneratorModule,
      imports: [],
      providers: [
        IntrigConfigService,
        ReactBindingService,
        IntrigNextBindingService,
        {
          provide: GeneratorBinding,
          inject: [IntrigConfigService, ReactBindingService, IntrigNextBindingService],
          useFactory: (configService: IntrigConfigService, reactBinding: ReactBindingService, nextBinding: IntrigNextBindingService): GeneratorBinding => {
            try {
              switch (configService.get().generator) {
                case "react":
                  return reactBinding;
                case "next":
                  return nextBinding;
              }
            } catch (e) {
            }
            return reactBinding;
          }
        }
      ],
      exports: [GeneratorBinding]
    };
  }
}
