import React, { useEffect, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { ComponentIcon, ServerIcon, BracesIcon, Link2Icon, ArrowLeftIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Mock data for demonstration purposes
// In a real application, this would come from an API or state management
const mockSources = [
  { id: "1", name: "User API", specUrl: "https://api.example.com/users/openapi.json", isOpenApi: true },
  { id: "2", name: "Products API", specUrl: "https://api.example.com/products/openapi.yaml", isOpenApi: true },
  { id: "3", name: "Orders API", specUrl: "https://api.example.com/orders/schema.json", isOpenApi: false },
  { id: "4", name: "Customers API", specUrl: "https://api.example.com/customers/openapi.json", isOpenApi: true }
];

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

// Sample markdown content for demonstration
const sampleMarkdown = `
# Endpoint Documentation

## Overview
This endpoint allows you to interact with the API resources.

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The unique identifier |
| filter | string | No | Filter results by criteria |

## Response Format

\`\`\`json
{
  "id": "123",
  "name": "Example",
  "status": "active"
}
\`\`\`

## Error Codes

- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error
`;

export function EndpointDetailPage() {
  const { sourceId, endpointId } = useParams<{ sourceId: string; endpointId: string }>();
  const [source, setSource] = useState<typeof mockSources[0] | null>(null);
  const [endpoint, setEndpoint] = useState<typeof mockEndpoints[keyof typeof mockEndpoints][0] | null>(null);
  
  useEffect(() => {
    // In a real application, this would be an API call
    if (sourceId) {
      const foundSource = mockSources.find(s => s.id === sourceId);
      if (foundSource) {
        setSource(foundSource);
        
        if (endpointId && mockEndpoints[sourceId as keyof typeof mockEndpoints]) {
          const foundEndpoint = mockEndpoints[sourceId as keyof typeof mockEndpoints].find(e => e.id === endpointId);
          if (foundEndpoint) {
            setEndpoint(foundEndpoint);
          }
        }
      }
    }
  }, [sourceId, endpointId]);

  // // If source or endpoint not found, we could redirect
  // if (!source && sourceId) {
  //   return <Navigate to="/" replace />;
  // }
  //
  // if (!endpoint && endpointId) {
  //   // Navigate to the source detail page instead of potentially going to homepage
  //   return <Navigate to=".." replace />;
  // }

  // Using react-markdown to render markdown content

  return (
    <div className="container mx-auto p-4 w-full flex flex-col">
      {source && endpoint ? (
        <>
          <div className="mb-6">
            <Link to={`..`} className="inline-flex items-center text-blue-600 hover:text-blue-800">
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to {source.name}
            </Link>
          </div>
          
          <h1 className="text-2xl font-bold mb-6">
            {endpoint.name}
          </h1>
          
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded-md text-white font-medium ${
                endpoint.method === 'GET' ? 'bg-blue-600' : 
                endpoint.method === 'POST' ? 'bg-green-600' : 
                endpoint.method === 'PUT' ? 'bg-yellow-600' : 
                endpoint.method === 'DELETE' ? 'bg-red-600' : 'bg-gray-600'
              }`}>
                {endpoint.method}
              </span>
              <span className="font-mono text-sm">{endpoint.path}</span>
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              {endpoint.description}
            </div>
          </div>
          
          <div className="border rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Documentation</h2>
            <div className="prose max-w-none">
              <ReactMarkdown>{sampleMarkdown}</ReactMarkdown>
            </div>
          </div>
        </>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
}

export default EndpointDetailPage;