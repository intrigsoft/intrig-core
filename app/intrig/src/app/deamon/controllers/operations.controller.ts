import {Controller, MessageEvent, Query, Sse} from '@nestjs/common';
import {ApiResponse, ApiTags, getSchemaPath} from "@nestjs/swagger";
import {OperationsService} from "../services/operations.service";
import {
  GenerateDoneEventDto, GenerateEventContext,
  GenerateStatusEventDto,
  SyncDoneEventDto,
  SyncEventContext,
  SyncStatusEventDto
} from "@intrig/common";
import {Subject} from "rxjs";

@ApiTags('Operations')
@Controller('operations')
export class OperationsController {
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
    const events$ = new Subject<MessageEvent>();
    let syncEventContext = new SyncEventContext(events$);
    await this.operationsService.sync(id, syncEventContext);
    syncEventContext.done(new SyncDoneEventDto(true));
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
    const events$ = new Subject<MessageEvent>()
    let generateEventContext = new GenerateEventContext(events$);
    await this.operationsService.generate(generateEventContext);
    generateEventContext.done(new GenerateDoneEventDto(true));
    return events$;
  }
}
