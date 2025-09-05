import { DynamicModule, Module } from '@nestjs/common';
import { LazyPluginService } from './lazy-plugin.service';

// Token for dependency injection - keeping for backward compatibility
export const INTRIG_PLUGIN = Symbol('INTRIG_PLUGIN');
export const INTRIG_PLUGIN_NAME = Symbol('INTRIG_PLUGIN_NAME');

@Module({})
export class PluginModule {
  static forRootAsync(): DynamicModule {
    return {
      module: PluginModule,
      providers: [
        LazyPluginService,
      ],
      exports: [LazyPluginService],
      global: true,
    };
  }

}