import { GeneratorContext, StatsCounter } from "@intrig/plugin-sdk";
import {InternalGeneratorContext} from "./internal-types.js";
import { packageJsonTemplate } from "./templates/packageJson.template.js";
import { indexTemplate } from "./templates/index.template.js";
import { networkStateTemplate } from "./templates/network-state.template.js";
import { contextTemplate } from "./templates/context.template.js";
import { reactLoggerTemplate } from "./templates/logger.template.js";
import { reactExtraTemplate } from "./templates/extra.template.js";
import { reactMediaTypeUtilsTemplate } from "./templates/media-type-utils.template.js";
import { typeUtilsTemplate } from "./templates/type-utils.template.js";
import { reactTsConfigTemplate } from "./templates/tsconfig.template.js";
import { reactSwcrcTemplate } from "./templates/swcrc.template.js";
import { intrigMiddlewareTemplate } from "./templates/intrigMiddleware.template.js";
import { flushSyncUtilTemplate } from "./templates/utils/flush-sync.template.js";

// Provider modular templates
import { providerMainTemplate } from "./templates/provider/main.template.js";
import { providerHooksTemplate } from "./templates/provider/hooks.template.js";
import { providerInterfacesTemplate } from "./templates/provider/interfaces.template.js";
import { providerReducerTemplate } from "./templates/provider/reducer.template.js";
import { providerAxiosConfigTemplate } from "./templates/provider/axios-config.template.js";
import { reactIntrigProviderTemplate } from "./templates/provider/intrig-provider.template.js";
import { reactIntrigProviderStubTemplate } from "./templates/provider/intrig-provider-stub.template.js";
import { reactStatusTrapTemplate } from "./templates/provider/status-trap.template.js";
import {requestHookTemplate} from "./templates/source/controller/method/requestHook.template.js";
import {paramsTemplate} from "./templates/source/controller/method/params.template.js";
import {asyncFunctionHookTemplate} from "./templates/source/controller/method/asyncFunctionHook.template.js";
import {clientIndexTemplate} from "./templates/source/controller/method/clientIndex.template.js";
import {downloadHookTemplate} from "./templates/source/controller/method/download.template.js";
import {typeTemplate} from "./templates/source/type/typeTemplate.js";

export async function generateCode(ctx: GeneratorContext): Promise<StatsCounter[]> {
  // Root/project files
  await ctx.dump(packageJsonTemplate(ctx));
  await ctx.dump(reactTsConfigTemplate());
  await ctx.dump(reactSwcrcTemplate());

  // Top-level src files
  await ctx.dump(indexTemplate());
  await ctx.dump(networkStateTemplate());
  await ctx.dump(contextTemplate(ctx.sources));
  await ctx.dump(reactLoggerTemplate());
  await ctx.dump(reactExtraTemplate());
  await ctx.dump(reactMediaTypeUtilsTemplate());
  await ctx.dump(typeUtilsTemplate());
  await ctx.dump(intrigMiddlewareTemplate());
  await ctx.dump(flushSyncUtilTemplate(ctx));

  // Provider modular files (placed under src)
  await ctx.dump(providerMainTemplate(ctx.sources));
  await ctx.dump(providerHooksTemplate());
  await ctx.dump(providerInterfacesTemplate(ctx.sources));
  await ctx.dump(providerReducerTemplate());
  await ctx.dump(providerAxiosConfigTemplate(ctx.sources));
  await ctx.dump(reactIntrigProviderTemplate(ctx.sources));
  await ctx.dump(reactIntrigProviderStubTemplate(ctx.sources));
  await ctx.dump(reactStatusTrapTemplate(ctx.sources));

  const potentiallyConflictingDescriptors = ctx.restDescriptors
    .sort((a, b) => (a.data.contentType === "application/json" ? -1 : 0) - (b.data.contentType === "application/json" ? -1 : 0))
    .filter((descriptor, index, array) => array.findIndex(other => other.data.operationId === descriptor.data.operationId) !== index)
    .map(descriptor => descriptor.id);

  const internalGeneratorContext = new InternalGeneratorContext(potentiallyConflictingDescriptors);

  for (const restDescriptor of ctx.restDescriptors) {
    await ctx.dump(requestHookTemplate(restDescriptor, internalGeneratorContext));
    await ctx.dump(paramsTemplate(restDescriptor, internalGeneratorContext));
    await ctx.dump(asyncFunctionHookTemplate(restDescriptor, internalGeneratorContext));
    if (restDescriptor.data.isDownloadable) {
      await ctx.dump(downloadHookTemplate(restDescriptor, internalGeneratorContext))
    }
    await ctx.dump(clientIndexTemplate([restDescriptor], internalGeneratorContext))
  }

  for (const schemaDescriptor of ctx.schemaDescriptors) {
    ctx.dump(typeTemplate(schemaDescriptor))
  }

  return internalGeneratorContext.getCounters()
}