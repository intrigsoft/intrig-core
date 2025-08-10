import {useEffect, useMemo} from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { ComponentIcon, ServerIcon, BracesIcon, Link2Icon, HomeIcon, ChevronRightIcon } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { DashboardSearch } from '@/components/dashboard-search';
import { SourceDownloadButton } from '@/components/source-download-button';
import { UrlAwareTabs } from '@/components/url-aware-tabs';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import {useSourcesControllerGetById} from '@intrig/react/deamon_api/Sources/sourcesControllerGetById/useSourcesControllerGetById'
import {useDataSearchControllerGetDataStats} from '@intrig/react/deamon_api/DataSearch/dataSearchControllerGetDataStats/useDataSearchControllerGetDataStats'
import {isSuccess} from "@intrig/react";
import EndpointsTab from "@/app/sources/[sourceId]/components/endpoints-tab";
import DataTypesTab from "@/app/sources/[sourceId]/components/datatypes-tab";


export function SourceDetailPage() {
  const { sourceId } = useParams<{ sourceId: string }>();

  const [sourceResp, fetchSource] = useSourcesControllerGetById({
    clearOnUnmount: true,
  })

  const [sourceStatsResp, fetchSourceStats] = useDataSearchControllerGetDataStats({
    clearOnUnmount: true,
  })

  useEffect(() => {
    if (sourceId) {
      fetchSource({
        id: sourceId
      })
    }
  }, [sourceId]);

  const source = useMemo(() => {
    if (isSuccess(sourceResp)) {
      return sourceResp.data
    }
    return null
  }, [sourceResp]);

  useEffect(() => {
    if (sourceId) {
      fetchSourceStats({
        source: sourceId
      })
    }
  }, [sourceId]);

  const stats = useMemo(() => {
    if (isSuccess(sourceStatsResp)) {
      return sourceStatsResp.data
    }
    return null
  }, [sourceStatsResp]);

  if (!source && sourceId) {
    return <div>Source not found</div>;
  }

  return (
    <div className="container mx-auto p-4 w-full flex flex-col">
      {source ? (
        <>
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">
                    <HomeIcon className="h-3 w-3" />
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRightIcon className="h-3 w-3" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>{source.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <h1 className="text-2xl font-bold mb-6">
            {source.name}
          </h1>
          
          {/* Top section with source info and stats */}
          <div className="flex flex-col md:flex-row justify-between mb-8">
            {/* Source info in top left */}
            <div className="flex flex-col items-start p-4 border rounded-lg shadow-sm bg-card">
              <h3 className="text-lg font-semibold mb-3">Source Information</h3>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-start">
                <span className="font-medium text-sm">ID:</span>
                <span className="text-sm text-muted-foreground font-mono">{source.id}</span>
                
                <span className="font-medium text-sm">Name:</span>
                <span className="text-sm text-muted-foreground">{source.name}</span>
                
                <span className="font-medium text-sm">Spec URL:</span>
                <a 
                  href={source.specUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-blue-600 hover:underline truncate max-w-xs"
                >
                  {source.specUrl}
                </a>
                
                <span className="font-medium text-sm">Type:</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                  <ServerIcon className="h-3 w-3"/>
                  <span>OpenAPI</span>
                </span>
                
                <span className="font-medium text-sm">Last Updated:</span>
                <span className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
              
              {/* Download button */}
              <div className="mt-4 pt-3 border-t">
                <SourceDownloadButton sourceId={sourceId!} />
              </div>
            </div>
            
            {/* Stats in top right */}
            {stats && (
              <div className="flex flex-col p-4 border rounded-lg shadow-sm bg-card">
                <h3 className="text-lg font-semibold mb-3">API Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard
                    title="Controllers"
                    value={stats.controllerCount}
                    usedValue={stats.usedControllerCount}
                    icon={<ComponentIcon className="h-4 w-4" />}
                    description="Total number of API controllers"
                  />
                  <StatCard
                    title="Endpoints" 
                    value={stats.endpointCount}
                    usedValue={stats.usedEndpointCount}
                    icon={<Link2Icon className="h-4 w-4" />}
                    description="Total number of API endpoints" 
                  />
                  <StatCard
                    title="Data Types" 
                    value={stats.dataTypeCount}
                    usedValue={stats.usedDataTypeCount}
                    icon={<BracesIcon className="h-4 w-4" />}
                    description="Total number of data models" 
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Search Box in the middle */}
          <div className="mx-auto w-full mb-8">
            <div className="p-4 border rounded-lg shadow-sm bg-card">
              <h3 className="text-lg font-semibold mb-3">Search API Resources</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Search for endpoints, controllers, or data types in this API source
              </p>
              <DashboardSearch source={sourceId} />
            </div>
          </div>
          
          {/* Tabs for Endpoints and Data Types */}
          <div className="mb-8">
            <div className="p-4 border rounded-lg shadow-sm bg-card">
              <h3 className="text-lg font-semibold mb-3">API Resources</h3>
              <UrlAwareTabs
                defaultTab="endpoints"
                tabs={[
                  {
                    value: "endpoints",
                    label: "Endpoints",
                    icon: <Link2Icon className="h-4 w-4" />,
                    content: (
                      <div className="p-1">
                        <p className="text-sm text-muted-foreground mb-4">
                          Browse all available API endpoints in this source
                        </p>
                        <EndpointsTab sourceId={sourceId} />
                      </div>
                    )
                  },
                  {
                    value: "datatypes",
                    label: "Data Types",
                    icon: <BracesIcon className="h-4 w-4" />,
                    content: (
                      <div className="p-1">
                        <p className="text-sm text-muted-foreground mb-4">
                          Browse all available data models in this source
                        </p>
                        <DataTypesTab sourceId={sourceId} />
                      </div>
                    )
                  }
                ]}
              />
            </div>
          </div>
        </>
      ) : (
        <Navigate to="/" replace />
      )}
    </div>
  );
}

export default SourceDetailPage;