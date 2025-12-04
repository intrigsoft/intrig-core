import {ResourceDescriptor, RestData, Tab} from "@intrig/plugin-sdk";
import {nestServiceMethodDocs} from "./templates/docs/service-method.js";

export async function getEndpointDocumentation(result: ResourceDescriptor<RestData>): Promise<Tab[]> {

  const tabs: Tab[] = []
  tabs.push({
    name: 'Service Method',
    content: (await nestServiceMethodDocs(result)).content
  })

  return tabs
}
