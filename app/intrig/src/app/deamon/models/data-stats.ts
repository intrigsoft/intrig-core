import { ApiProperty } from '@nestjs/swagger';

export interface IDataStats {
  sourceCount: number;
  endpointCount: number;
  dataTypeCount: number;
  controllerCount: number;
  usedEndpointCount: number;
  usedDataTypeCount: number;
  usedSourceCount: number;
  usedControllerCount: number;
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

  @ApiProperty({ description: 'Number of unique endpoints used in the codebase' })
  usedEndpointCount: number;

  @ApiProperty({ description: 'Number of data types used in the codebase' })
  usedDataTypeCount: number;
  
  @ApiProperty({ description: 'Number of sources used in the codebase' })
  usedSourceCount: number;
  
  @ApiProperty({ description: 'Number of controllers used in the codebase' })
  usedControllerCount: number;

  constructor(
    sourceCount: number, 
    endpointCount: number, 
    dataTypeCount: number, 
    controllerCount: number,
    usedEndpointCount = 0,
    usedDataTypeCount = 0,
    usedSourceCount = 0,
    usedControllerCount = 0
  ) {
    this.sourceCount = sourceCount;
    this.endpointCount = endpointCount;
    this.dataTypeCount = dataTypeCount;
    this.controllerCount = controllerCount;
    this.usedEndpointCount = usedEndpointCount;
    this.usedDataTypeCount = usedDataTypeCount;
    this.usedSourceCount = usedSourceCount;
    this.usedControllerCount = usedControllerCount;
  }

  static from(stats: IDataStats) {
    return new DataStats(
      stats.sourceCount, 
      stats.endpointCount, 
      stats.dataTypeCount, 
      stats.controllerCount,
      stats.usedEndpointCount,
      stats.usedDataTypeCount,
      stats.usedSourceCount,
      stats.usedControllerCount
    );
  }
}