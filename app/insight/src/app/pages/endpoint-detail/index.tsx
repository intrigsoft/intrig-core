import React, {useEffect, useMemo} from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, FileJson, ArrowLeftIcon, ExternalLink } from 'lucide-react';
import {useDataSearchControllerGetEndpointById} from '@intrig/react/deamon_api/DataSearch/dataSearchControllerGetEndpointById/useDataSearchControllerGetEndpointById';
import {useDataSearchControllerGetFileList} from '@intrig/react/deamon_api/DataSearch/dataSearchControllerGetFileList/useDataSearchControllerGetFileList';
import {isSuccess, isPending, isError} from "@intrig/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { SchemaViewButton } from "@/components/schema-view-button";
import { PinButton, PinContextProvider } from "@/components/pin-button";
import { UsageCountBadge, UsageFilesList } from "@/components/usage-files-list";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";


export function EndpointDetailPage() {
  const { sourceId, endpointId } = useParams<{ sourceId: string; endpointId: string }>();

  useDataSearchControllerGetFileList({
    clearOnUnmount: true,
    fetchOnMount: true,
    params: {
      sourceId: sourceId ?? '',
      id: endpointId ?? '',
      type: 'endpoint'
    }
  })

  const [resp, fetch] = useDataSearchControllerGetEndpointById({
    clearOnUnmount: true,
    fetchOnMount: true,
    params: {
      id: endpointId ?? ''
    }
  });

  useEffect(() => {
    fetch({
      id: endpointId ?? ''
    });
  }, [endpointId]);

  const data = useMemo(() => {
    if (isSuccess(resp)) {
      return resp.data;
    } else if (isError(resp)) {
      console.error(resp);
    }
    return null;
  }, [resp]);

  if (isPending(resp)) {
    return (
      <div className="container mx-auto space-y-8 py-6">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-24 bg-muted rounded animate-pulse"/>
          <div className="h-8 w-64 bg-muted rounded animate-pulse"/>
          <div className="flex items-center gap-2">
            <div className="h-6 w-16 bg-muted rounded animate-pulse"/>
            <div className="h-6 w-48 bg-muted rounded animate-pulse"/>
          </div>
          <div className="h-4 w-96 bg-muted rounded animate-pulse"/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-96 bg-muted rounded animate-pulse"/>
          <div className="h-64 bg-muted rounded animate-pulse"/>
        </div>
        <div className="h-96 bg-muted rounded animate-pulse"/>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold">Endpoint not found</h1>
        <p className="mt-4">The endpoint you're looking for doesn't exist or hasn't been configured yet.</p>
        <Button asChild className="mt-6">
          <Link to={`/sources/${sourceId}`}>Back to Source</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 py-6">
      <div className="flex flex-col gap-2 relative">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/sources">Sources</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/sources/${sourceId}`}>{sourceId}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{data.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="absolute top-0 right-0">
          <PinButton 
            item={{
              id: data.id || endpointId || '',
              name: data.name,
              source: sourceId || '',
              type: 'endpoint',
              accessTime: new Date().toISOString()
            }} 
          />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
          <UsageCountBadge />
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-md text-white ${
              data.method === "GET"
                ? "bg-blue-600"
                : data.method === "POST"
                  ? "bg-green-600"
                  : data.method === "PUT"
                    ? "bg-yellow-600"
                    : "bg-red-600"
            }`}
          >
            {data.method}
          </span>
          <code className="font-mono text-sm bg-muted px-2 py-1 rounded">{data.path}</code>
        </div>
        <p className="text-muted-foreground">{data.description}</p>
      </div>

      <Tabs defaultValue={data.tabs?.[0]?.name ?? "overview"} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {data.tabs && data.tabs.map(tab => (
            <TabsTrigger key={tab.name} value={tab.name}>{tab.name}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Request</CardTitle>
                <CardDescription>Information about the request for {data.name} endpoint</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Request Model Section */}
                {data.requestBody && (
                  <div className="border-b pb-4">
                    <h3 className="text-sm font-medium mb-2">Request Model</h3>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm bg-muted px-2 py-1 rounded">{data.requestBody.name}</code>
                      <SchemaViewButton 
                        schemaId={data.requestBody.id} 
                        schemaName={data.requestBody.name} 
                        sourceId={sourceId || ''} 
                        buttonText="View Model Schema"
                      />
                    </div>
                  </div>
                )}

                {/* Parameters Section */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Parameters</h3>
                  {data.variables && data.variables.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 font-medium">Parameter</th>
                          <th className="text-left p-2 font-medium">Type</th>
                          <th className="text-left p-2 font-medium">Required</th>
                          <th className="text-left p-2 font-medium">Description</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {data.variables.map((param) => (
                          <tr key={param.name}>
                            <td className="p-2 font-mono">{param.name}</td>
                            <td className="p-2 font-mono text-xs">
                              {param.relatedType && (
                                <Link to={`/sources/${sourceId}/datatype/${param.relatedType.id}`}>
                                  {param.relatedType.name}
                                </Link>
                              )}
                            </td>
                            <td className="p-2">{param.in === 'path' ? "Yes" : "No"}</td>
                            <td className="p-2">{param.description || ""}</td>
                          </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">This endpoint doesn't require any parameters.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Response</CardTitle>
                  <CardDescription>Response data structure</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-sm mb-2">Response Type:</p>
                    <code className="font-mono text-sm bg-muted px-2 py-1 rounded block overflow-auto">
                      {data.response?.name || "No response type defined"}
                    </code>
                  </div>
                  <div className="flex flex-col gap-2">
                    {data.response && (
                      <SchemaViewButton
                        schemaId={data.response.id}
                        schemaName={data.response.name}
                        sourceId={sourceId || ''}
                        buttonText="View Response Model"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              <UsageFilesList
                sourceId={sourceId || ''}
                id={data.id || endpointId || ''}
                type="endpoint"
              />
            </div>
          </div>
        </TabsContent>

        {data.tabs && data.tabs.map(tab => (
          <TabsContent key={tab.name} value={tab.name}>
            <Card>
              <CardContent className="pt-6">
                <MarkdownRenderer content={tab.content || ""} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default function EndpointDetailPageWrapper() {
  return (
    <PinContextProvider>
      <EndpointDetailPage />
    </PinContextProvider>
  );
}