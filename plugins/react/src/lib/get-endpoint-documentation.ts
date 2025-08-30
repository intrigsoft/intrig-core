import {ResourceDescriptor, RestData, Tab} from "@intrig/plugin-sdk";
import {reactSseHookDocs} from "./templates/docs/sse-hook.js";
import {reactHookDocs} from "./templates/docs/react-hook.js";
import {reactAsyncFunctionHookDocs} from "./templates/docs/async-hook.js";
import {reactDownloadHookDocs} from "./templates/docs/download-hook.js";

export async function getEndpointDocumentation(result: ResourceDescriptor<RestData>): Promise<Tab[]> {

  const tabs: Tab[] = []
  if (result.data.responseType === 'text/event-stream') {
    tabs.push({
      name: 'SSE Hook',
      content: (await reactSseHookDocs(result)).content
    })
  } else {
    tabs.push({
      name: 'Stateful Hook',
      content: (await reactHookDocs(result)).content
    })
  }

  tabs.push({
    name: 'Stateless Hook',
    content: (await reactAsyncFunctionHookDocs(result)).content
  })

  if (result.data.isDownloadable) {
    tabs.push({
      name: 'Download Hook',
      content: (await reactDownloadHookDocs(result)).content
    })
  }

  return tabs
}