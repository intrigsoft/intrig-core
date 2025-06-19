'use server';

import { headers } from 'next/headers';
import { IntrigProvider } from './intrig-provider';
import { DefaultConfigs } from './intrig-context';

export async function IntrigLayout({
  children,
  configs,
}: {
  children: React.ReactNode;
  configs?: DefaultConfigs;
}) {
  const headersData = await headers();
  const hydratedResponsesStr = headersData.get('INTRIG_HYDRATED');
  const hydratedResponses = hydratedResponsesStr
    ? JSON.parse(hydratedResponsesStr)
    : {};
  headersData.delete('INTRIG_HYDRATED');

  return (
    <>
      <IntrigProvider configs={configs} initState={hydratedResponses}>
        {children}
      </IntrigProvider>
    </>
  );
}

export default IntrigLayout;
