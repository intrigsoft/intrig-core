import {GenerateEventContext} from "./generate-event";

export interface GeneratorContext {
  potentiallyConflictingDescriptors: string[];
  generatorCtx?: GenerateEventContext
}