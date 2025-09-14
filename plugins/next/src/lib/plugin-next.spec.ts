import { createPlugin } from './plugin-next.js';

describe('createPlugin', () => {
  it('should create a valid IntrigGeneratorPlugin', () => {
    const plugin = createPlugin();
    expect(plugin).toBeDefined();
    expect(plugin.meta).toBeDefined();
    expect(plugin.generate).toBeDefined();
    expect(plugin.getSchemaDocumentation).toBeDefined();
    expect(plugin.getEndpointDocumentation).toBeDefined();
    
    const meta = plugin.meta();
    expect(meta.name).toBe('intrig-binding');
    expect(meta.version).toBe('0.0.1');
    expect(meta.compat).toBe('^0.0.15');
  });
});
