import { GeneratorContext, StatsCounter, ResourceDescriptor, RestData, camelCase } from "@intrig/plugin-sdk";
import {InternalGeneratorContext} from "./internal-types.js";
import { packageJsonTemplate } from "./templates/packageJson.template.js";
import { indexTemplate } from "./templates/index.template.js";
import { nestTsConfigTemplate } from "./templates/tsconfig.template.js";
import { moduleTemplate } from "./templates/module.template.js";
import { serviceTemplate } from "./templates/service/service.template.js";
import { typeTemplate } from "./templates/type/typeTemplate.js";

/**
 * Extract service name from operationId or path
 * Examples:
 *   - getUser -> users
 *   - createPost -> posts
 *   - listProducts -> products
 *   - /api/users/{id} -> users
 */
function extractServiceName(descriptor: ResourceDescriptor<RestData>): string {
  const operationId = descriptor.data.operationId;

  // Try to extract from operationId first
  // Common patterns: getUser, createUser, listUsers, getUserById
  const operationPrefixes = ['get', 'post', 'put', 'patch', 'delete', 'create', 'update', 'list', 'fetch', 'remove'];

  for (const prefix of operationPrefixes) {
    if (operationId.toLowerCase().startsWith(prefix)) {
      const rest = operationId.substring(prefix.length);
      if (rest.length > 0) {
        // Extract the resource name (e.g., "User" from "getUser")
        const resourceName = rest.replace(/By.*$/, ''); // Remove "ById", "ByName", etc.
        return camelCase(resourceName.endsWith('s') ? resourceName : resourceName + 's');
      }
    }
  }

  // Fallback: extract from path
  const path = descriptor.data.paths[0] || '';
  const pathSegments = path.split('/').filter(s => s && !s.startsWith('{'));

  if (pathSegments.length > 0) {
    // Take the first meaningful segment
    const segment = pathSegments[0];
    return camelCase(segment);
  }

  // Ultimate fallback: use source name
  return camelCase(descriptor.source);
}

/**
 * Group REST descriptors by service name
 */
function groupDescriptorsByService(
  descriptors: ResourceDescriptor<RestData>[]
): Record<string, ResourceDescriptor<RestData>[]> {
  const grouped: Record<string, ResourceDescriptor<RestData>[]> = {};

  for (const descriptor of descriptors) {
    const serviceName = extractServiceName(descriptor);
    if (!grouped[serviceName]) {
      grouped[serviceName] = [];
    }
    grouped[serviceName].push(descriptor);
  }

  return grouped;
}

export async function generateCode(ctx: GeneratorContext): Promise<StatsCounter[]> {
  // Root/project files
  await ctx.dump(packageJsonTemplate(ctx));
  await ctx.dump(nestTsConfigTemplate());

  const internalGeneratorContext = new InternalGeneratorContext();

  // Group REST descriptors by service
  const groupedDescriptors = groupDescriptorsByService(ctx.restDescriptors);
  const serviceNames = Object.keys(groupedDescriptors).sort();

  // Generate module and index files
  await ctx.dump(moduleTemplate(serviceNames, ctx.sources));
  await ctx.dump(indexTemplate(serviceNames));

  // Generate service files
  for (const [serviceName, descriptors] of Object.entries(groupedDescriptors)) {
    const source = descriptors[0]?.source || 'default';
    await ctx.dump(serviceTemplate(serviceName, descriptors, source));

    // Track statistics
    const counter = internalGeneratorContext.getCounter(source);
    counter.inc('services');
    descriptors.forEach(() => counter.inc('methods'));
  }

  // Generate type files
  for (const schemaDescriptor of ctx.schemaDescriptors) {
    await ctx.dump(typeTemplate(schemaDescriptor));

    // Track statistics
    const counter = internalGeneratorContext.getCounter(schemaDescriptor.source);
    counter.inc('types');
  }

  return internalGeneratorContext.getCounters();
}
