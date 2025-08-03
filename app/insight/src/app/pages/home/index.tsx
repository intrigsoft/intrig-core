import React from 'react';
import { DatabaseIcon, ServerIcon, CodeIcon } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { DashboardSearch } from '@/components/dashboard-search';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SourceCard } from '@/components/source-card';

// Mock data for demonstration purposes
// In a real application, this would come from an API or state management
const stats = {
  sources: 12,
  endpoints: 48,
  dataTypes: 24
};

// Mock sources data
// In a real application, this would come from an API or state management
const mockSources = [
  { id: "1", name: "User API", specUrl: "https://api.example.com/users/openapi.json", isOpenApi: true },
  { id: "2", name: "Products API", specUrl: "https://api.example.com/products/openapi.yaml", isOpenApi: true },
  { id: "3", name: "Orders API", specUrl: "https://api.example.com/orders/schema.json", isOpenApi: false },
  { id: "4", name: "Customers API", specUrl: "https://api.example.com/customers/openapi.json", isOpenApi: true }
];

export function HomePage() {
  return (
    <div className="container mx-auto p-4 w-full flex flex-col">
      <h1 className="text-2xl font-bold mb-6">
        <SidebarTrigger/>
        Dashboard
      </h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Sources" 
          value={stats.sources} 
          icon={<DatabaseIcon className="h-4 w-4" />} 
        />
        <StatCard 
          title="Endpoints" 
          value={stats.endpoints} 
          icon={<ServerIcon className="h-4 w-4" />} 
        />
        <StatCard 
          title="Data Types" 
          value={stats.dataTypes} 
          icon={<CodeIcon className="h-4 w-4" />} 
        />
      </div>
      
      {/* Search Box */}
      <div className="max-w-md mx-auto w-full mb-8">
        <DashboardSearch />
      </div>
      
      {/* Sources List */}
      <div className="w-full">
        <h2 className="text-xl font-semibold mb-4">Sources</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mockSources.map((source) => (
            <SourceCard
              key={source.id}
              id={source.id}
              name={source.name}
              specUrl={source.specUrl}
              isOpenApi={source.isOpenApi}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomePage;