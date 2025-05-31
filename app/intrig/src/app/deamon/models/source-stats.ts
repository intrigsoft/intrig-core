import {ApiProperty} from '@nestjs/swagger';

export interface ISourceStats {
  total: number,
  countsByType: Record<string, number>,
  uniqueSources: string[],
  uniqueSourcesCount: number
}


export class SourceStats implements ISourceStats {
  @ApiProperty({description: 'Total number of sources'})
  total: number;

  @ApiProperty({description: 'Count of sources grouped by their type'})
  countsByType: Record<string, number>;

  @ApiProperty({description: 'List of unique source identifiers', type: [String]})
  uniqueSources: string[];

  @ApiProperty({description: 'Number of unique sources'})
  uniqueSourcesCount: number;

  constructor(total: number, countsByType: Record<string, number>, uniqueSources: string[], uniqueSourcesCount: number) {
    this.total = total;
    this.countsByType = countsByType;
    this.uniqueSources = uniqueSources;
    this.uniqueSourcesCount = uniqueSourcesCount;
  }

  static from(stats: ISourceStats) {
    return new SourceStats(stats.total, stats.countsByType, stats.uniqueSources, stats.uniqueSourcesCount);
  }
}