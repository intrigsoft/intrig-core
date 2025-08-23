import { Module } from '@nestjs/common';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginHostService } from './plugin-host.service';

@Module({
  providers: [PluginRegistryService, PluginHostService],
  exports: [PluginRegistryService, PluginHostService],
})
export class PluginModule {}
