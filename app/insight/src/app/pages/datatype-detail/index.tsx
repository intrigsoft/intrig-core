import React, { useEffect, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { CodeIcon, ArrowLeftIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Mock data for demonstration purposes
// In a real application, this would come from an API or state management
const mockSources = [
  { id: "1", name: "User API", specUrl: "https://api.example.com/users/openapi.json", isOpenApi: true },
  { id: "2", name: "Products API", specUrl: "https://api.example.com/products/openapi.yaml", isOpenApi: true },
  { id: "3", name: "Orders API", specUrl: "https://api.example.com/orders/schema.json", isOpenApi: false },
  { id: "4", name: "Customers API", specUrl: "https://api.example.com/customers/openapi.json", isOpenApi: true }
];

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

// Sample markdown content for demonstration
const sampleMarkdown = `
# Data Type Documentation

## Overview
This data type represents a structured entity in the API.

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | The unique identifier |
| name | string | Yes | The name of the entity |
| email | string | Yes | The email address |
| createdAt | datetime | Yes | Creation timestamp |

## Example

\`\`\`json
{
  "id": "123",
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2023-01-01T12:00:00Z"
}
\`\`\`

## Related Types

- UserPreferences
- UserRole
`;

export function DatatypeDetailPage() {
  const { sourceId, datatypeId } = useParams<{ sourceId: string; datatypeId: string }>();
  const [source, setSource] = useState<typeof mockSources[0] | null>(null);
  const [datatype, setDatatype] = useState<typeof mockDatatypes[keyof typeof mockDatatypes][0] | null>(null);
  
  useEffect(() => {
    // In a real application, this would be an API call
    if (sourceId) {
      const foundSource = mockSources.find(s => s.id === sourceId);
      if (foundSource) {
        setSource(foundSource);
        
        if (datatypeId && mockDatatypes[sourceId as keyof typeof mockDatatypes]) {
          const foundDatatype = mockDatatypes[sourceId as keyof typeof mockDatatypes].find(d => d.id === datatypeId);
          if (foundDatatype) {
            setDatatype(foundDatatype);
          }
        }
      }
    }
  }, [sourceId, datatypeId]);

  return (
    <div className="container mx-auto p-4 w-full flex flex-col">
      {source && datatype ? (
        <>
          <div className="mb-6">
            <Link to={`..`} className="inline-flex items-center text-blue-600 hover:text-blue-800">
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to {source.name}
            </Link>
          </div>
          
          <h1 className="text-2xl font-bold mb-6">
            {datatype.name}
          </h1>
          
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 rounded-md bg-purple-100 text-purple-800 font-medium">
                <CodeIcon className="h-4 w-4 inline mr-1" />
                Data Type
              </span>
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              {datatype.description}
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Fields:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {datatype.fields.map((field, index) => (
                  <div key={index} className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                    {field}
                  </div>
                ))}
              </div>
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

export default DatatypeDetailPage;