import {typescript} from "common";
import * as path from 'path'

export function intrigLayoutTemplate(_path: string) {

  const ts = typescript(path.resolve(_path, "src", "intrig-layout.tsx"))
  return ts`
"use server"

import { headers } from 'next/headers';
import { IntrigProvider } from './intrig-provider';
import { DefaultConfigs } from './intrig-context';

export async function IntrigLayout({children, configs}: { children: React.ReactNode, configs?: DefaultConfigs}) {

  let headersData = await headers();
  let hydratedResponsesStr = headersData.get('INTRIG_HYDRATED');
  let hydratedResponses = hydratedResponsesStr ? JSON.parse(hydratedResponsesStr) : {}
  headersData.delete('INTRIG_HYDRATED');

  return <>
    <IntrigProvider configs={configs} initState={hydratedResponses}>
      {children}
    </IntrigProvider>
  </>
}

export default IntrigLayout;
`
}
