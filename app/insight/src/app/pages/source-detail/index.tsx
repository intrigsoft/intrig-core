import {useEffect, useMemo, useState} from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { ComponentIcon, ServerIcon, BracesIcon, Link2Icon } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { DashboardSearch } from '@/components/dashboard-search';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EndpointsTab } from './endpoints-tab';
import { DataTypesTab } from './datatypes-tab';
import {useSourcesControllerGetById} from '@intrig/react/deamon_api/Sources/sourcesControllerGetById/useSourcesControllerGetById'
import {useDataSearchControllerGetDataStats} from '@intrig/react/deamon_api/DataSearch/dataSearchControllerGetDataStats/useDataSearchControllerGetDataStats'
import {isSuccess} from "@intrig/react";


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

  // Initialize endpoints and datatypes as empty arrays
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [datatypes, setDatatypes] = useState<any[]>([]);

  // In a real application, you would fetch endpoints and datatypes from an API
  // This is left empty intentionally as we're using sample data in the tab components

  // If source not found, we could redirect to a 404 page
  if (!source && sourceId) {
    return <div>Source not found</div>;
  }

  return (
    <div className="container mx-auto p-4 w-full flex flex-col">
      {source ? (
        <>
          <h1 className="text-2xl font-bold mb-6">
            {source.name}
          </h1>
          
          {/* Top section with source info and stats */}
          <div className="flex flex-col md:flex-row justify-between mb-8">
            {/* Source info in top left */}
            <div className="flex flex-col items-start">
              <div className="text-sm text-muted-foreground mb-2">ID: {source.id}</div>
              <div className="text-sm text-muted-foreground mb-2">
                <span className="font-medium">Spec URL:</span> {source.specUrl}
              </div>
              <div className="text-sm">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                  {(
                    <>
                      <ServerIcon className="h-3 w-3"/>
                      <span>OpenAPI</span>
                    </>
                  )}
                </span>
              </div>
            </div>
            
            {/* Stats in top right */}
            {stats && (
              <div className="flex flex-col md:flex-row gap-4 mb-4 md:mb-0">
                <StatCard
                  title="Controllers"
                  value={stats.controllerCount}
                  icon={<ComponentIcon className="h-4 w-4" />}
                />
                <StatCard
                  title="Endpoints" 
                  value={stats.endpointCount}
                  icon={<Link2Icon className="h-4 w-4" />} 
                />
                <StatCard
                  title="Data Types" 
                  value={stats.dataTypeCount}
                  icon={<BracesIcon className="h-4 w-4" />} 
                />
              </div>
            )}
          </div>
          
          {/* Search Box in the middle */}
          <div className="max-w-md mx-auto w-full mb-8">
            <DashboardSearch source={sourceId} />
          </div>
          
          {/* Tabs for Endpoints and Data Types */}
          <div className="mb-8">
            <Tabs defaultValue="endpoints" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="endpoints">
                  <Link2Icon className="h-4 w-4 mr-2" />
                  Endpoints
                </TabsTrigger>
                <TabsTrigger value="datatypes">
                  <BracesIcon className="h-4 w-4 mr-2" />
                  Data Types
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="endpoints" className="mt-0">
                <EndpointsTab endpoints={endpoints || []} sourceId={sourceId} />
              </TabsContent>
              
              <TabsContent value="datatypes" className="mt-0">
                <DataTypesTab datatypes={datatypes || []} sourceId={sourceId} />
              </TabsContent>
            </Tabs>
          </div>
        </>
      ) : (
        <Navigate to="/" replace />
      )}
    </div>
  );
}

export default SourceDetailPage;