import {Body, Controller, HttpStatus, Logger, MessageEvent, Post, Query, Res, Sse} from '@nestjs/common';
import {Response} from 'express';
import {ApiExtraModels, ApiResponse, ApiTags, getSchemaPath} from "@nestjs/swagger";
import {OperationsService} from "../services/operations.service";
import {
  GenerateDoneEventDto, GenerateEventContext,
  GenerateStatusEventDto,
  SyncDoneEventDto,
  SyncEventContext,
  SyncStatusEventDto
} from "common";
import {Subject} from "rxjs";

@ApiTags('Operations')
@ApiExtraModels(SyncStatusEventDto, SyncDoneEventDto, GenerateStatusEventDto, GenerateDoneEventDto)
@Controller('operations')
export class OperationsController {
  private readonly logger = new Logger(OperationsController.name);

  constructor(private operationsService: OperationsService) {

  }

  @Sse('sync')
  @ApiResponse({
    status: 200,
    description: 'Sync events',
    content: {
      'text/event-stream': {
        schema: {
          oneOf: [
            { $ref: getSchemaPath(SyncStatusEventDto) },
            { $ref: getSchemaPath(SyncDoneEventDto) },
          ]
        },
      }
    }
  })
  async sync(@Query('id') id?: string) {
    this.logger.log(`Starting sync operation${id ? ` for id: ${id}` : ''}`);
    const events$ = new Subject<MessageEvent>();
    setTimeout(async () => {
      const syncEventContext = new SyncEventContext(events$);
      await this.operationsService.sync(syncEventContext, id);
      syncEventContext.done(new SyncDoneEventDto(true));
      this.logger.log('Sync operation completed');
    }, 0)
    return events$;
  }

  @Sse('generate')
  @ApiResponse({
    status: 200,
    description: 'Generate events',
    content: {
      'text/event-stream': {
        schema: {
          oneOf: [
            { $ref: getSchemaPath(GenerateStatusEventDto) },
            { $ref: getSchemaPath(GenerateDoneEventDto) },
          ]
        }
      }
    }
  })
  async generate() {
    this.logger.log('Starting generate operation');
    const events$ = new Subject<MessageEvent>()
    setTimeout(async () => {
      const generateEventContext = new GenerateEventContext(events$);
      await this.operationsService.generate(generateEventContext);
      generateEventContext.done(new GenerateDoneEventDto(true));
      this.logger.log('Generate operation completed');
    }, 0)
    return events$;
  }

  @Post('verify')
  @ApiResponse({
    status: 200,
    description: 'Verify hashes - successful verification',
  })
  @ApiResponse({
    status: 409,
    description: 'Verify hashes - validation conflicts found',
  })
  async verify(@Body() hashes: Record<string, string>, @Res() res: Response) {
    this.logger.log('Starting verify operation');
    const result = await this.operationsService.verify(hashes);
    this.logger.log('Verify operation completed');
    
    const statusCode = result.statusCode || 200;
    return res.status(statusCode).json(result);
  }
}
