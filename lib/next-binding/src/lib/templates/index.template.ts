import {typescript} from "@intrig/common";
import * as path from 'path'

export function indexTemplate(_path: string) {

  const ts = typescript(path.resolve(_path, "src", "index.ts"))

  return ts`
  export * from './intrig-provider';
  export * from './intrig-layout';
  export * from './network-state';
  export * from './extra';
  `
}
