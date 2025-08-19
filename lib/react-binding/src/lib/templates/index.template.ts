import {typescript} from "common";
import * as path from 'path'

export function reactIndexTemplate(_path: string){

  const ts = typescript(path.resolve(_path, "src", "index.ts"))

  return ts`
  export * from './intrig-provider-main';
  export * from './network-state';
  export * from './extra';
  export * from './media-type-utils';
  `
}
