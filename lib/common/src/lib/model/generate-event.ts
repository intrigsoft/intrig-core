import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {Subject} from "rxjs";
import {MessageEvent} from "@nestjs/common";
import {EventContext, EventDto} from "./event-context";


type Step = 'getConfig' | 'clear' | 'read' | 'generate' | 'install' | 'build' | 'copy-to-node-modules' | 'postBuild' | 'finalize';

type Status = 'started' | 'success' | 'error';

export interface IGenerateStatusEventDto extends EventDto<Step> {
  sourceId: string;
  step: Step;
  status: Status;
  info?: string;
  error?: string;
}

export class GenerateStatusEventDto implements IGenerateStatusEventDto {
  @ApiProperty({ example: 'alpha' })
  sourceId: string;

  @ApiProperty({ enum: ['getConfig', 'clear', 'read', 'generate', 'install', 'build', 'copy-to-node-modules', 'postBuild'] })
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

  public static from(event: IGenerateStatusEventDto) {
    return new GenerateStatusEventDto(event.sourceId, event.step, event.status, event.info, event.error);
  }
}

export interface IGenerateDoneEventDto {
  allSources: boolean;
}

export class GenerateDoneEventDto implements IGenerateDoneEventDto {
  @ApiProperty({ example: true })
  allSources: boolean;

  constructor(allSources: boolean) {
    this.allSources = allSources;
  }

  public static from(event: IGenerateDoneEventDto) {
    return new GenerateDoneEventDto(event.allSources);
  }
}

export class StatsCounter {
  private counters: Record<string, number> = {};
  constructor(private sourceId: string) {
  }

  inc(key: string) {
    this.counters[key] = (this.counters[key] || 0) + 1;
  }
}

export class GenerateEventContext implements EventContext<IGenerateStatusEventDto> {
  private skippedEndpointsBySource: Record<string, Array<{endpoint: string, reason: string}>> = {};
  private codeGenerationBreakdown: Record<string, StatsCounter> = {};

  constructor(public events$: Subject<MessageEvent>) {
  }

  status(event: IGenerateStatusEventDto) {
    this.events$.next({data: GenerateStatusEventDto.from(event)});
  }

  done(event: IGenerateDoneEventDto) {
    this.events$.next({data: GenerateDoneEventDto.from(event)});
    this.events$.complete();
  }

  setSkippedEndpoints(sourceId: string, skippedEndpoints: Array<{endpoint: string, reason: string}>) {
    this.skippedEndpointsBySource[sourceId] = skippedEndpoints;
  }

  getSkippedEndpoints(): Record<string, Array<{endpoint: string, reason: string}>> {
    return this.skippedEndpointsBySource;
  }

  getSkippedEndpointsForSource(sourceId: string): Array<{endpoint: string, reason: string}> {
    return this.skippedEndpointsBySource[sourceId] || [];
  }

  getCounter(sourceId: string) {
    this.codeGenerationBreakdown[sourceId] = this.codeGenerationBreakdown[sourceId] || new StatsCounter(sourceId);
    return this.codeGenerationBreakdown[sourceId];
  }

  getCodeGenerationBreakdown(): Record<string, StatsCounter> {
    return this.codeGenerationBreakdown;
  }
}