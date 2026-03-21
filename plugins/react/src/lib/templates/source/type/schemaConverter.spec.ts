import { openApiSchemaToZod } from './schemaConverter';
import { OpenAPIV3_1 } from 'openapi-types';

describe('openApiSchemaToZod', () => {
  describe('array of enums', () => {
    it('should wrap enum union type in parentheses for array type annotation', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
          enum: ['PENDING', 'APPROVED', 'REJECTED'],
        },
      };

      const result = openApiSchemaToZod(schema);

      // The tsType should have parentheses around the union
      expect(result.tsType).toBe("('PENDING' | 'APPROVED' | 'REJECTED')[]");

      // The zodSchema type annotation should also have parentheses
      expect(result.zodSchema).toContain("z.ZodType<('PENDING' | 'APPROVED' | 'REJECTED')[]");
      expect(result.zodSchema).toContain("z.ZodTypeDef, ('PENDING' | 'APPROVED' | 'REJECTED')[]>");
    });

    it('should generate correct zod enum schema for array items', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
          enum: ['A', 'B'],
        },
      };

      const result = openApiSchemaToZod(schema);

      expect(result.zodSchema).toContain("z.enum(['A', 'B'])");
    });
  });

  describe('simple enum', () => {
    it('should generate union type for string enum', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'string',
        enum: ['ACTIVE', 'INACTIVE'],
      };

      const result = openApiSchemaToZod(schema);

      expect(result.tsType).toBe("'ACTIVE' | 'INACTIVE'");
      expect(result.zodSchema).toBe("z.enum(['ACTIVE', 'INACTIVE'])");
    });
  });

  describe('array of primitives', () => {
    it('should handle array of strings', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
        },
      };

      const result = openApiSchemaToZod(schema);

      expect(result.tsType).toBe('(string)[]');
      expect(result.zodSchema).toContain('z.array(z.string())');
    });

    it('should handle array of numbers', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'array',
        items: {
          type: 'number',
        },
      };

      const result = openApiSchemaToZod(schema);

      expect(result.tsType).toBe('(number)[]');
      expect(result.zodSchema).toContain('z.array(z.number())');
    });
  });

  describe('array with constraints', () => {
    it('should apply minItems and maxItems constraints inside preprocess', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
        },
        minItems: 1,
        maxItems: 10,
      };

      const result = openApiSchemaToZod(schema);

      // Constraints should be on z.array(), inside the preprocess
      expect(result.zodSchema).toContain('z.array(z.string()).min(1).max(10)');
      // The constraints should NOT be after the type cast
      expect(result.zodSchema).not.toMatch(/z\.ZodType<.*>\)\.min/);
    });

    it('should apply only minItems when maxItems is not specified', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
        },
        minItems: 1,
      };

      const result = openApiSchemaToZod(schema);

      expect(result.zodSchema).toContain('z.array(z.string()).min(1)');
      expect(result.zodSchema).not.toContain('.max(');
    });

    it('should apply only maxItems when minItems is not specified', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
        },
        maxItems: 5,
      };

      const result = openApiSchemaToZod(schema);

      expect(result.zodSchema).toContain('z.array(z.string()).max(5)');
      expect(result.zodSchema).not.toContain('.min(');
    });
  });
});
