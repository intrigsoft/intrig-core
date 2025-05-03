import {Subject} from "rxjs";
import {MessageEvent} from "@nestjs/common";

type Status = 'started' | 'success' | 'error';

export interface EventDto<Step> {
  sourceId: string;
  step: Step;
  status: Status;
  info?: string;
  error?: string;
}

export interface EventContext<StatusEvent extends EventDto<any>> {
  status(event: StatusEvent): void;
  done(event: any): void;
  events$: Subject<MessageEvent>
}

export function WithStatus<Step, Args extends any[]>(
  eventFactory: (...args: Args) => Omit<EventDto<Step>, 'status'>,
) {
  return (
    target: any,
    key: string,
    descriptor: TypedPropertyDescriptor<(ctx: EventContext<EventDto<Step>>, ...args: Args) => Promise<any>>,
  )=> {
    const original = descriptor.value
    descriptor.value = async function (ctx, ...args: Args) {
      const event = eventFactory.apply(this, args)

      ctx.status({...event, status: 'started'})
      try {
        const result = await original?.apply(this, [ctx, ...args])
        ctx.status({...event, status: 'success'})
        return result
      } catch (e) {
        ctx.status({...event, status: 'error', error: JSON.stringify(e)})
        throw e
      }
    }
  }
}