import {Controller, MessageEvent, Query, Sse} from '@nestjs/common';
import {OperationsService} from "./operations.service";
import {Subject} from "rxjs";
import {ApiExtraModels, ApiResponse, ApiTags, getSchemaPath} from "@nestjs/swagger";
import {DoneEventDto, StatusEventDto, SyncEventContext} from "@intrig/common";

@ApiTags('Operations')
@ApiExtraModels(StatusEventDto, DoneEventDto)
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
            { $ref: getSchemaPath(StatusEventDto) },
            { $ref: getSchemaPath(DoneEventDto) },
          ]
        },
      }
    }
  })
  async sync(@Query('id') id?: string) {
    const events$ = new Subject<MessageEvent>();
    let syncEventContext = new SyncEventContext(events$);
    await this.operationsService.sync(id, syncEventContext);
    syncEventContext.done(new DoneEventDto(true));
    return events$;
  }
}
