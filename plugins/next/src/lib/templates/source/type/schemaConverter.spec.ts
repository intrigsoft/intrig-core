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

  describe('binary file size constraints', () => {
    it('should apply minLength as file size constraint for binary format', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'string',
        format: 'binary',
        minLength: 1024,
      };

      const result = openApiSchemaToZod(schema);

      expect(result.tsType).toBe('BinaryData');
      expect(result.zodSchema).toContain('BinaryDataSchema');
      expect(result.zodSchema).toContain('.refine((blob) => blob.size >= 1024');
    });

    it('should apply maxLength as file size constraint for binary format', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'string',
        format: 'binary',
        maxLength: 5242880, // 5MB
      };

      const result = openApiSchemaToZod(schema);

      expect(result.tsType).toBe('BinaryData');
      expect(result.zodSchema).toContain('BinaryDataSchema');
      expect(result.zodSchema).toContain('.refine((blob) => blob.size <= 5242880');
    });

    it('should apply both min and max file size constraints for binary format', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'string',
        format: 'binary',
        minLength: 1,
        maxLength: 10485760, // 10MB
      };

      const result = openApiSchemaToZod(schema);

      expect(result.zodSchema).toContain('.refine((blob) => blob.size >= 1');
      expect(result.zodSchema).toContain('.refine((blob) => blob.size <= 10485760');
    });

    it('should apply size constraints for byte format', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'string',
        format: 'byte',
        minLength: 100,
        maxLength: 1000,
      };

      const result = openApiSchemaToZod(schema);

      expect(result.tsType).toBe('Uint8Array');
      expect(result.zodSchema).toContain('.refine((arr) => arr.length >= 100');
      expect(result.zodSchema).toContain('.refine((arr) => arr.length <= 1000');
    });
  });

  describe('enum with special characters', () => {
    it('should escape single quotes in enum values', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'string',
        enum: ["it's", "won't", "simple"],
      };

      const result = openApiSchemaToZod(schema);

      // Single quotes must be escaped to generate valid code
      expect(result.tsType).toBe("'it\\'s' | 'won\\'t' | 'simple'");
      expect(result.zodSchema).toBe("z.enum(['it\\'s', 'won\\'t', 'simple'])");
    });

    it('should escape backslashes in enum values', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'string',
        enum: ["path\\to\\file", "normal"],
      };

      const result = openApiSchemaToZod(schema);

      // Backslashes must be escaped
      expect(result.tsType).toBe("'path\\\\to\\\\file' | 'normal'");
      expect(result.zodSchema).toBe("z.enum(['path\\\\to\\\\file', 'normal'])");
    });
  });

  describe('regex pattern with special characters', () => {
    it('should escape single quotes in regex patterns', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'string',
        pattern: "^[a-z]+'s$",  // Pattern containing single quote
      };

      const result = openApiSchemaToZod(schema);

      // Single quotes in pattern must be escaped
      expect(result.zodSchema).toContain("new RegExp('^[a-z]+\\'s$')");
    });

    it('should escape backslashes in regex patterns', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'string',
        pattern: "^\\d+\\.\\d+$",  // Pattern with backslashes
      };

      const result = openApiSchemaToZod(schema);

      // Backslashes in pattern must be escaped for string literal
      expect(result.zodSchema).toContain("new RegExp('^\\\\d+\\\\.\\\\d+$')");
    });
  });

  describe('allOf with multiple schemas', () => {
    it('should handle allOf with exactly 2 schemas', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        allOf: [
          { type: 'object', properties: { a: { type: 'string' } } },
          { type: 'object', properties: { b: { type: 'number' } } },
        ],
      };

      const result = openApiSchemaToZod(schema);

      // Should use .and() for chaining, not z.intersection with multiple args
      expect(result.zodSchema).not.toContain('z.intersection(');
      expect(result.zodSchema).toContain('.and(');
    });

    it('should handle allOf with 3+ schemas using chained .and()', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        allOf: [
          { type: 'object', properties: { a: { type: 'string' } } },
          { type: 'object', properties: { b: { type: 'number' } } },
          { type: 'object', properties: { c: { type: 'boolean' } } },
        ],
      };

      const result = openApiSchemaToZod(schema);

      // z.intersection() only takes 2 args, so must chain with .and()
      // Should NOT generate: z.intersection(A, B, C) - this is invalid!
      expect(result.zodSchema).not.toContain('z.intersection(');
      // Should generate: A.and(B).and(C)
      expect(result.zodSchema).toMatch(/\.and\(.*\)\.and\(/);
    });
  });

  describe('number exclusive bounds', () => {
    it('should handle exclusiveMinimum for numbers', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'number',
        exclusiveMinimum: 0,
      };

      const result = openApiSchemaToZod(schema);

      // exclusiveMinimum means > not >=, so use .gt() not .min()
      expect(result.zodSchema).toContain('.gt(0)');
      expect(result.zodSchema).not.toContain('.min(0)');
    });

    it('should handle exclusiveMaximum for numbers', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'number',
        exclusiveMaximum: 100,
      };

      const result = openApiSchemaToZod(schema);

      // exclusiveMaximum means < not <=, so use .lt() not .max()
      expect(result.zodSchema).toContain('.lt(100)');
      expect(result.zodSchema).not.toContain('.max(100)');
    });

    it('should handle exclusiveMinimum for integers', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'integer',
        exclusiveMinimum: 0,
      };

      const result = openApiSchemaToZod(schema);

      expect(result.zodSchema).toContain('.gt(0)');
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
