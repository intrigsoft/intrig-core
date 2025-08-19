import { IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PinItemDto {
  @ApiProperty({
    description: 'Item ID',
    example: '123456'
  })
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Item type',
    enum: ['schema', 'endpoint'],
    example: 'schema'
  })
  @IsNotEmpty()
  @IsEnum(['schema', 'endpoint'])
  type: 'schema' | 'endpoint';

  @ApiProperty({
    description: 'Item source',
    required: false,
    example: 'petstore'
  })
  @IsOptional()
  source?: string;

  @ApiProperty({
    description: 'Item name',
    required: false,
    example: 'Pet'
  })
  @IsOptional()
  name?: string;
}