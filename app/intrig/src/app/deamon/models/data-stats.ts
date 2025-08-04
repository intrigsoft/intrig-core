import { ApiProperty } from '@nestjs/swagger';

export interface IDataStats {
  sourceCount: number;
  endpointCount: number;
  dataTypeCount: number;
  controllerCount: number;
}

export class DataStats implements IDataStats {
  @ApiProperty({ description: 'Number of unique sources' })
  sourceCount: number;

  @ApiProperty({ description: 'Number of endpoints' })
  endpointCount: number;

  @ApiProperty({ description: 'Number of data types' })
  dataTypeCount: number;

  @ApiProperty({ description: 'Number of unique paths in endpoints' })
  controllerCount: number;

  constructor(sourceCount: number, endpointCount: number, dataTypeCount: number, controllerCount: number) {
    this.sourceCount = sourceCount;
    this.endpointCount = endpointCount;
    this.dataTypeCount = dataTypeCount;
    this.controllerCount = controllerCount;
  }

  static from(stats: IDataStats) {
    return new DataStats(stats.sourceCount, stats.endpointCount, stats.dataTypeCount, stats.controllerCount);
  }
}