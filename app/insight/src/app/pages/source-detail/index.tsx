import React, { useEffect, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { DatabaseIcon, ServerIcon, CodeIcon } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { DashboardSearch } from '@/components/dashboard-search';

// Mock data for demonstration purposes
// In a real application, this would come from an API or state management
const mockSources = [
  { id: "1", name: "User API", specUrl: "https://api.example.com/users/openapi.json", isOpenApi: true },
  { id: "2", name: "Products API", specUrl: "https://api.example.com/products/openapi.yaml", isOpenApi: true },
  { id: "3", name: "Orders API", specUrl: "https://api.example.com/orders/schema.json", isOpenApi: false },
  { id: "4", name: "Customers API", specUrl: "https://api.example.com/customers/openapi.json", isOpenApi: true }
];

// Mock stats for demonstration purposes
const mockSourceStats = {
  "1": { endpoints: 15, dataTypes: 8, operations: 24, controllers: 5 },
  "2": { endpoints: 12, dataTypes: 6, operations: 18, controllers: 4 },
  "3": { endpoints: 8, dataTypes: 4, operations: 12, controllers: 3 },
  "4": { endpoints: 13, dataTypes: 7, operations: 20, controllers: 6 }
};

// Mock endpoints data
const mockEndpoints = {
  "1": [
    { id: "e1", name: "Get Users", path: "/users", method: "GET", description: "Retrieve a list of users" },
    { id: "e2", name: "Create User", path: "/users", method: "POST", description: "Create a new user" },
    { id: "e3", name: "Get User", path: "/users/{id}", method: "GET", description: "Retrieve a specific user" }
  ],
  "2": [
    { id: "e4", name: "Get Products", path: "/products", method: "GET", description: "Retrieve a list of products" },
    { id: "e5", name: "Create Product", path: "/products", method: "POST", description: "Create a new product" }
  ],
  "3": [
    { id: "e6", name: "Get Orders", path: "/orders", method: "GET", description: "Retrieve a list of orders" }
  ],
  "4": [
    { id: "e7", name: "Get Customers", path: "/customers", method: "GET", description: "Retrieve a list of customers" }
  ]
};

// Mock datatypes data
const mockDatatypes = {
  "1": [
    { id: "d1", name: "User", fields: ["id", "name", "email", "createdAt"], description: "User account information" },
    { id: "d2", name: "UserPreferences", fields: ["userId", "theme", "notifications"], description: "User preference settings" },
    { id: "d3", name: "UserRole", fields: ["id", "name", "permissions"], description: "User role and permissions" }
  ],
  "2": [
    { id: "d4", name: "Product", fields: ["id", "name", "price", "description", "category"], description: "Product information" },
    { id: "d5", name: "Category", fields: ["id", "name", "parentId"], description: "Product category" }
  ],
  "3": [
    { id: "d6", name: "Order", fields: ["id", "userId", "products", "total", "status"], description: "Customer order information" }
  ],
  "4": [
    { id: "d7", name: "Customer", fields: ["id", "name", "email", "address"], description: "Customer information" }
  ]
};

export function SourceDetailPage() {
  const { sourceId } = useParams<{ sourceId: string }>();
  const [source, setSource] = useState<typeof mockSources[0] | null>(null);
  const [stats, setStats] = useState<typeof mockSourceStats[keyof typeof mockSourceStats] | null>(null);
  const [endpoints, setEndpoints] = useState<typeof mockEndpoints[keyof typeof mockEndpoints] | null>(null);
  const [datatypes, setDatatypes] = useState<typeof mockDatatypes[keyof typeof mockDatatypes] | null>(null);
  
  useEffect(() => {
    // In a real application, this would be an API call
    if (sourceId) {
      const foundSource = mockSources.find(s => s.id === sourceId);
      if (foundSource) {
        setSource(foundSource);
        setStats(mockSourceStats[sourceId as keyof typeof mockSourceStats]);
        setEndpoints(mockEndpoints[sourceId as keyof typeof mockEndpoints] || []);
        setDatatypes(mockDatatypes[sourceId as keyof typeof mockDatatypes] || []);
      }
    }
  }, [sourceId]);

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
                  {source.isOpenApi ? (
                    <>
                      <ServerIcon className="h-3 w-3" />
                      <span>OpenAPI</span>
                    </>
                  ) : (
                    <>
                      <CodeIcon className="h-3 w-3" />
                      <span>JSON Schema</span>
                    </>
                  )}
                </span>
              </div>
            </div>
            
            {/* Stats in top right */}
            {stats && (
              <div className="flex flex-col md:flex-row gap-4 mb-4 md:mb-0">
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
                <StatCard 
                  title="Controllers" 
                  value={stats.controllers} 
                  icon={<DatabaseIcon className="h-4 w-4" />} 
                />
              </div>
            )}
          </div>
          
          {/* Search Box in the middle */}
          <div className="max-w-md mx-auto w-full mb-8">
            <DashboardSearch />
          </div>
          
          {/* Collapsible Endpoints List */}
          {endpoints && endpoints.length > 0 && (
            <div className="mb-8">
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none">
                  <h2 className="text-xl font-semibold">Endpoints</h2>
                  <span className="transition group-open:rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </summary>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {endpoints.map(endpoint => (
                    <Link 
                      key={endpoint.id} 
                      to={`endpoint/${endpoint.id}`}
                      className="block no-underline text-inherit"
                    >
                      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                          <h3 className="text-sm font-medium tracking-tight">{endpoint.name}</h3>
                          <span className={`px-2 py-1 text-xs rounded-md text-white font-medium ${
                            endpoint.method === 'GET' ? 'bg-blue-600' : 
                            endpoint.method === 'POST' ? 'bg-green-600' : 
                            endpoint.method === 'PUT' ? 'bg-yellow-600' : 
                            endpoint.method === 'DELETE' ? 'bg-red-600' : 'bg-gray-600'
                          }`}>
                            {endpoint.method}
                          </span>
                        </div>
                        <div className="text-xs font-mono mb-2">{endpoint.path}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {endpoint.description}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </details>
            </div>
          )}
          
          {/* Collapsible Data Types List */}
          {datatypes && datatypes.length > 0 && (
            <div className="mb-8">
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none">
                  <h2 className="text-xl font-semibold">Data Types</h2>
                  <span className="transition group-open:rotate-180">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </summary>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {datatypes.map(datatype => (
                    <Link 
                      key={datatype.id} 
                      to={`datatype/${datatype.id}`}
                      className="block no-underline text-inherit"
                    >
                      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                          <h3 className="text-sm font-medium tracking-tight">{datatype.name}</h3>
                          <span className="px-2 py-1 text-xs rounded-md bg-purple-100 text-purple-800 font-medium">
                            <CodeIcon className="h-3 w-3 inline mr-1" />
                            Type
                          </span>
                        </div>
                        <div className="text-xs mb-2">
                          Fields: {datatype.fields.length}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {datatype.description}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </details>
            </div>
          )}
        </>
      ) : (
        <Navigate to="/" replace />
      )}
    </div>
  );
}

export default SourceDetailPage;