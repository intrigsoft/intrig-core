// src/controllers/dto/search-query.dto.ts
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";
import {Type} from "class-transformer";

export class SearchQuery {
  @ApiProperty({ required: false, description: 'full-text query' })
  @IsOptional() @IsString() query?: string;

  @ApiProperty({ required: false, description: 'filter by descriptor type', enum: ['rest', 'schema'] })
  @IsOptional() @IsString() type?: string;

  @ApiProperty({ required: false, description: 'filter by source id' })
  @IsOptional() @IsString() source?: string;

  @ApiProperty({ required: false, description: 'filter by REST package path' })
  @IsOptional() @IsString() pkg?: string;

  @ApiProperty({ required: false, description: 'zero-based page index', default: 0, type: Number })
  @Type(() => Number)
  @IsOptional() @IsInt() @Min(0) page = 0;

  @ApiProperty({ required: false, description: 'page size', default: 10, type: Number })
  @Type(() => Number)
  @IsOptional() @IsInt() @Min(1) size = 10;
}
