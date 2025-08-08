import {typescript} from "common";
import * as path from 'path'

export function nextIndexTemplate(_path: string) {

  const ts = typescript(path.resolve(_path, "src", "index.ts"))

  return ts`
  export * from './intrig-provider';
  export * from './intrig-layout';
  export * from './network-state';
  export * from './extra';
  `
}
