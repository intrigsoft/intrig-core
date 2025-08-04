import {useMemo} from 'react';
import { ServerIcon, Link2Icon, BracesIcon, ComponentIcon } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { DashboardSearch } from '@/components/dashboard-search';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SourceCard } from '@/components/source-card';
import {useDataSearchControllerGetDataStats} from '@intrig/react/deamon_api/DataSearch/dataSearchControllerGetDataStats/useDataSearchControllerGetDataStats';
import {useSourcesControllerList} from '@intrig/react/deamon_api/Sources/sourcesControllerList/useSourcesControllerList'
import {isSuccess} from "@intrig/react";

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
    }
    return null;
  }, [statsResp]);

  return (
    <div className="container mx-auto p-4 w-full flex flex-col">
      <h1 className="text-2xl font-bold mb-6">
        Dashboard
      </h1>
      
      {/* Stats Grid */}
      {stats && <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Sources"
          value={stats.sourceCount}
          icon={<ServerIcon className="h-4 w-4" />}
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
      </div>}
      
      {/* Search Box */}
      <div className="max-w-md mx-auto w-full mb-8">
        <DashboardSearch />
      </div>
      
      {/* Sources List */}
      <div className="w-full">
        <h2 className="text-xl font-semibold mb-4">Sources</h2>
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
        </div>
      </div>
    </div>
  );
}

export default HomePage;