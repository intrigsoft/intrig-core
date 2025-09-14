import { StatsCounter } from "@intrig/plugin-sdk";

export class InternalGeneratorContext {
  private codeGenerationBreakdown: Record<string, StatsCounter> = {};
  constructor(public readonly potentiallyConflictingDescriptors: string[]) {}

  getCounter(sourceId: string) {
    this.codeGenerationBreakdown[sourceId] = this.codeGenerationBreakdown[sourceId] || new StatsCounter(sourceId);
    return this.codeGenerationBreakdown[sourceId];
  }

  getCounters() {
    return [...Object.values(this.codeGenerationBreakdown)];
  }
}
