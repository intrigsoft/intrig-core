import {useMemo} from 'react';
import { ServerIcon, Link2Icon, BracesIcon, ComponentIcon, LayoutDashboardIcon } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { DashboardSearch } from '@/components/dashboard-search';
import { SourceCard } from '@/components/source-card';
import {useDataSearchControllerGetDataStats} from '@intrig/react/deamon_api/DataSearch/dataSearchControllerGetDataStats/useDataSearchControllerGetDataStats';
import {useSourcesControllerList} from '@intrig/react/deamon_api/Sources/sourcesControllerList/useSourcesControllerList'
import {isError, isSuccess} from "@intrig/react";

export function HomePage() {

  const [statsResp] = useDataSearchControllerGetDataStats({
    clearOnUnmount: true,
    fetchOnMount: true,
    params: {

    }
  });

  const [sourcesListResp] = useSourcesControllerList({
    clearOnUnmount: true,
    fetchOnMount: true,
    params: {

    },
  })

  const sourcesList = useMemo(() => {
    if (isSuccess(sourcesListResp)) {
      return sourcesListResp.data;
    }
    return [];
  }, [sourcesListResp]);

  const stats = useMemo(() => {
    if (isSuccess(statsResp)) {
      return statsResp.data;
    } else if (isError(statsResp)) {
      console.error('Error fetching stats:', statsResp.error);
    }
    return null;
  }, [statsResp]);

  return (
    <div className="container mx-auto p-4 w-full flex flex-col">
      <div className="flex items-center mb-6">
        <LayoutDashboardIcon className="h-6 w-6 mr-2 text-primary" />
        <h1 className="text-2xl font-bold">API Insight Dashboard</h1>
      </div>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        Welcome to the API Insight Dashboard. Explore your API sources, search for endpoints and data types, and view detailed statistics about your APIs.
      </p>
      
      {/* Stats Grid */}
      {stats && (
        <div className="p-4 border rounded-lg shadow-sm bg-card mb-8">
          <h2 className="text-lg font-semibold mb-3">API Statistics Overview</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Summary of all API resources across all sources
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Sources"
              value={stats.sourceCount}
              usedValue={stats.usedSourceCount}
              icon={<ServerIcon className="h-4 w-4" />}
              description="Total number of API sources"
            />
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
      
      {/* Search Box */}
      <div className="max-w-xl mx-auto w-full mb-8">
        <div className="p-4 border rounded-lg shadow-sm bg-card">
          <h2 className="text-lg font-semibold mb-3">Search API Resources</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Search across all sources for endpoints, controllers, or data types
          </p>
          <DashboardSearch />
        </div>
      </div>
      
      {/* Sources List */}
      <div className="w-full">
        <div className="p-4 border rounded-lg shadow-sm bg-card">
          <h2 className="text-lg font-semibold mb-3">API Sources</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Browse all available API sources and click to view detailed information
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sourcesList.map((source) => (
              <SourceCard
                key={source.id}
                id={source.id}
                name={source.name}
                specUrl={source.specUrl}
                isOpenApi={true}
              />
            ))}
            {sourcesList.length === 0 && (
              <div className="col-span-full text-center p-8 text-muted-foreground">
                No API sources found. Add a source to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;