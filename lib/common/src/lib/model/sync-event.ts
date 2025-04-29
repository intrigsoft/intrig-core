import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {Subject} from "rxjs";
import {MessageEvent} from "@nestjs/common";


type Step = 'getConfig' | 'fetch' | 'decode' | 'normalize' | 'save';

type Status = 'started' | 'success' | 'error';

export interface IStatusEventDto {
  sourceId: string;
  step: Step;
  status: Status;
  info?: string;
  error?: string;
}

export class StatusEventDto implements IStatusEventDto {
  @ApiProperty({ example: 'alpha' })
  sourceId: string;

  @ApiProperty({ enum: ['getConfig', 'fetch','normalize','save'] })
  step: Step;

  @ApiProperty({ enum: ['started','success','error'] })
  status: Status;

  @ApiPropertyOptional({ example: '200 OK' })
  info?: string;

  @ApiPropertyOptional({ example: 'disk full' })
  error?: string;

  constructor(sourceId: string, step: Step, status: Status, info?: string, error?: string) {
    this.sourceId = sourceId;
    this.step = step;
    this.status = status;
    this.info = info;
    this.error = error;
  }

  public static from(event: IStatusEventDto) {
    return new StatusEventDto(event.sourceId, event.step, event.status, event.info, event.error);
  }
}

export interface IDoneEventDto {
  allSources: boolean;
}

export class DoneEventDto implements IDoneEventDto {
  @ApiProperty({ example: true })
  allSources: boolean;

  constructor(allSources: boolean) {
    this.allSources = allSources;
  }

  public static from(event: IDoneEventDto) {
    return new DoneEventDto(event.allSources);
  }
}

export class SyncEventContext {
  constructor(private events$: Subject<MessageEvent>) {
  }

  status(event: IStatusEventDto) {
    this.events$.next({ data: StatusEventDto.from(event) });
  }

  done(event: IDoneEventDto) {
    this.events$.next({ data: DoneEventDto.from(event) });
  }
}