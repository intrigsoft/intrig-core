import {typescript} from "@intrig/plugin-sdk";
import * as path from 'path'

export function indexTemplate(){

  const ts = typescript(path.resolve("src", "index.ts"))

  return ts`
  export * from './intrig-provider-main';
  export * from './network-state';
  export * from './extra';
  export * from './media-type-utils';
  `
}
