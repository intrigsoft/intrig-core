import { ApiProperty } from '@nestjs/swagger';

// Define the class for our tracked items
export class EntityView {
  @ApiProperty({
    description: 'Unique identifier of the item',
    example: '123456'
  })
  id: string;

  @ApiProperty({
    description: 'Name of the item',
    example: 'User Schema'
  })
  name: string;

  @ApiProperty({
    description: 'Source of the item',
    example: 'petstore'
  })
  source: string;

  @ApiProperty({
    description: 'Timestamp when the item was last accessed',
    example: '2025-08-05T21:07:00.000Z'
  })
  accessTime: string;

  @ApiProperty({
    description: 'Type of the item',
    enum: ['schema', 'endpoint'],
    example: 'schema'
  })
  type: 'schema' | 'endpoint';

  @ApiProperty({
    description: 'Whether the item is pinned',
    required: false,
    example: false
  })
  pinned?: boolean;
  
  constructor(data: {
    id: string;
    name: string;
    source: string;
    accessTime?: string;
    type: 'schema' | 'endpoint';
    pinned?: boolean;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.source = data.source;
    this.accessTime = data.accessTime || new Date().toISOString();
    this.type = data.type;
    this.pinned = data.pinned || false;
  }
}