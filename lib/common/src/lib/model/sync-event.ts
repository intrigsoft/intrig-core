import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {Subject} from "rxjs";
import {MessageEvent} from "@nestjs/common";


type Step = 'getConfig' | 'fetch' | 'decode' | 'normalize' | 'save';

type Status = 'started' | 'success' | 'error';

export interface ISyncStatusEventDto {
  sourceId: string;
  step: Step;
  status: Status;
  info?: string;
  error?: string;
}

export class SyncStatusEventDto implements ISyncStatusEventDto {
  @ApiProperty({ example: 'alpha' })
  sourceId: string;

  @ApiProperty({ enum: ['getConfig', 'fetch', 'decode', 'normalize', 'save'] })
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

  public static from(event: ISyncStatusEventDto) {
    return new SyncStatusEventDto(event.sourceId, event.step, event.status, event.info, event.error);
  }
}

export interface ISyncDoneEventDto {
  allSources: boolean;
}

export class SyncDoneEventDto implements ISyncDoneEventDto {
  @ApiProperty({ example: true })
  allSources: boolean;

  constructor(allSources: boolean) {
    this.allSources = allSources;
  }

  public static from(event: ISyncDoneEventDto) {
    return new SyncDoneEventDto(event.allSources);
  }
}

export class SyncEventContext {
  constructor(private events$: Subject<MessageEvent>) {
  }

  status(event: ISyncStatusEventDto) {
    this.events$.next({ data: SyncStatusEventDto.from(event) });
  }

  done(event: ISyncDoneEventDto) {
    this.events$.next({ data: SyncDoneEventDto.from(event) });
    this.events$.complete();
  }
}