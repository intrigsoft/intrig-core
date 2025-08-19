import {useEffect, useMemo} from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDataSearchControllerGetSchemaDocsById } from '@intrig/react/daemon_api/DataSearch/dataSearchControllerGetSchemaDocsById/useDataSearchControllerGetSchemaDocsById';
import {isSuccess, isPending, isError} from "@intrig/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { PinButton, PinContextProvider } from "@/components/pin-button";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { OpenAPIV3_1 } from "openapi-types";
import {
  useDataSearchControllerGetFileList
} from "@intrig/react/daemon_api/DataSearch/dataSearchControllerGetFileList/useDataSearchControllerGetFileList";
import {UsageCountBadge, UsageFilesList} from "@/components/usage-files-list";

export function DatatypeDetailPage() {
  const { sourceId, datatypeId } = useParams<{ sourceId: string; datatypeId: string }>();

  useDataSearchControllerGetFileList({
    clearOnUnmount: true,
    fetchOnMount: true,
    params: {
      sourceId: sourceId ?? '',
      id: datatypeId ?? '',
      type: 'datatype'
    }
  })

  const [resp, fetch] = useDataSearchControllerGetSchemaDocsById({
    clearOnUnmount: true,
    fetchOnMount: true,
    params: {
      id: datatypeId ?? ''
    }
  });

  useEffect(() => {
    fetch({
      id: datatypeId ?? ''
    });
  }, [datatypeId]);

  const data = useMemo(() => {
    if (isSuccess(resp)) {
      return resp.data;
    } else if (isError(resp)) {
      console.error(resp);
    }
    return null;
  }, [resp]);

  const jsonSchema: OpenAPIV3_1.SchemaObject | undefined = useMemo(() => {
    return data?.jsonSchema;
  }, [data]);

  if (isPending(resp)) {
    return (
      <div className="container mx-auto space-y-8 py-6">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-48 bg-muted rounded animate-pulse"/>
          <div className="h-8 w-96 bg-muted rounded animate-pulse"/>
          <div className="h-4 w-72 bg-muted rounded animate-pulse"/>
        </div>

        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-muted rounded animate-pulse"/>
            <div className="h-4 w-64 bg-muted rounded animate-pulse"/>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse"/>
                  <div className="h-4 w-24 bg-muted rounded animate-pulse"/>
                  <div className="h-4 w-24 bg-muted rounded animate-pulse"/>
                  <div className="h-4 w-16 bg-muted rounded animate-pulse"/>
                  <div className="h-4 w-48 bg-muted rounded animate-pulse"/>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-6 w-40 bg-muted rounded animate-pulse"/>
            <div className="h-4 w-56 bg-muted rounded animate-pulse"/>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex justify-between items-center p-3 border rounded-md">
                  <div className="h-4 w-64 bg-muted rounded animate-pulse"/>
                  <div className="h-8 w-24 bg-muted rounded animate-pulse"/>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold">Data Type not found</h1>
        <p className="mt-4">The data type you're looking for doesn't exist or hasn't been configured yet.</p>
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
              id: data.id || datatypeId || '',
              name: data.name,
              source: sourceId || '',
              type: 'schema',
              accessTime: new Date().toISOString()
            }} 
          />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
          <UsageCountBadge />
        </div>
        <p className="text-muted-foreground">{data.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Properties</CardTitle>
          <CardDescription>Fields and types for the {data.name} model</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
              <tr>
                <th className="text-left p-2 font-medium">Property</th>
                <th className="text-left p-2 font-medium">Type</th>
                <th className="text-left p-2 font-medium">Format</th>
                <th className="text-left p-2 font-medium">Required</th>
                <th className="text-left p-2 font-medium">Description</th>
              </tr>
              </thead>
              <tbody className="divide-y">
              {Object.entries(jsonSchema?.properties ?? {})?.map(([name, prop]) => {
                const _prop = prop as OpenAPIV3_1.SchemaObject;
                return (<tr key={name}>
                  <td className="p-2 font-mono">{name}</td>
                  <td className="p-2 font-mono">{_prop?.type}</td>
                  <td className="p-2 font-mono text-xs">{_prop?.format || _prop?.enum?.join(", ") || "-"}</td>
                  <td className="p-2">{jsonSchema?.required?.includes(name) ? "Yes" : "No"}</td>
                  <td className="p-2">{_prop?.description}</td>
                </tr>);
              })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {data.tabs && data.tabs.length > 0 && (
        <Tabs defaultValue={data.tabs[0].name} className="w-full">
          <TabsList className="mb-4">
            {data.tabs.map(tab => <TabsTrigger key={tab.name} value={tab.name}>{tab.name}</TabsTrigger>)}
          </TabsList>

          {data.tabs.map(tab => (
            <TabsContent key={tab.name} value={tab.name} className="mt-0">
              <Card>
                <CardContent className="pt-6">
                  <MarkdownRenderer content={tab.content.trim()} />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Related Endpoints</CardTitle>
            <CardDescription>Endpoints that use this model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.relatedEndpoints?.map((endpoint) => (
                <div key={endpoint.id} className="flex justify-between items-center p-3 border rounded-md">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-md text-white ${
                          endpoint.method === "GET"
                            ? "bg-blue-600"
                            : endpoint.method === "POST"
                              ? "bg-green-600"
                              : endpoint.method === "PUT"
                                ? "bg-yellow-600"
                                : "bg-red-600"
                        }`}
                      >
                        {endpoint.method}
                      </span>
                      <span className="font-medium">{endpoint.name}</span>
                    </div>
                    <code className="font-mono text-sm bg-muted px-2 py-1 rounded">{endpoint.path}</code>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/sources/${sourceId}/endpoints/${endpoint.id}`}>View Details</Link>
                  </Button>
                </div>
              ))}
              {(!data.relatedEndpoints || data.relatedEndpoints.length === 0) && (
                <p className="text-muted-foreground">No related endpoints found for this data type.</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <UsageFilesList 
          sourceId={sourceId || ''} 
          id={data.id || datatypeId || ''} 
          type="datatype" 
        />
      </div>
    </div>
  );
}

export default function DatatypeDetailPageWrapper() {
  return (
    <PinContextProvider>
      <DatatypeDetailPage />
    </PinContextProvider>
  );
}