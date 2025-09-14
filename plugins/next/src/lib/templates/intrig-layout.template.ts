import { typescript } from '@intrig/plugin-sdk';
import * as path from 'path';

export function intrigLayoutTemplate() {
  const ts = typescript(path.resolve('src', 'intrig-layout.tsx'));
  
  return ts`"use server"

import { headers } from 'next/headers';
import { IntrigProvider } from './intrig-provider';
import { DefaultConfigs } from './interfaces';

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
`;
}