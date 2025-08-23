import {ResourceDescriptor, RestData, Schema, Tab} from "@intrig/plugin-sdk";
import {reactSseHookDocs} from "./templates/docs/sse-hook.js";
import {reactHookDocs} from "./templates/docs/react-hook.js";
import {reactAsyncFunctionHookDocs} from "./templates/docs/async-hook.js";
import {reactDownloadHookDocs} from "./templates/docs/download-hook.js";

export async function getEndpointDocumentation(result: ResourceDescriptor<RestData>, schemas: ResourceDescriptor<Schema>[]) {
  const mapping = Object.fromEntries(schemas.map(a => ([a.name, {name: a.name, id: a.id}])));

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

  return {
    id: result.id,
    name: result.name,
    method: result.data.method,
    path: result.data.requestUrl!,
    description: result.data.description,
    requestBody: result.data.requestBody ? mapping[result.data.requestBody] : undefined,
    contentType: result.data.contentType,
    response: result.data.response ? mapping[result.data.response] : undefined,
    responseType: result.data.responseType,
    requestUrl: result.data.requestUrl!,
    variables: result.data.variables?.map(a => ({
      ...a,
      relatedType: mapping[a.ref.split('/').pop()!],
    })) ?? [],
    responseExamples: result.data.responseExamples ?? {},
    tabs
  }
}