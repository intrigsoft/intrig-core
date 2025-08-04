import React, {useEffect, useMemo, useState} from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { ComponentIcon, ServerIcon, BracesIcon, Link2Icon, ArrowLeftIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {useDataSearchControllerGetEndpointById} from '@intrig/react/deamon_api/DataSearch/dataSearchControllerGetEndpointById/useDataSearchControllerGetEndpointById';
import {isSuccess} from "@intrig/react";


export function EndpointDetailPage() {
  const { sourceId, endpointId } = useParams<{ sourceId: string; endpointId: string }>();

  const [endpointResp] = useDataSearchControllerGetEndpointById({
    clearOnUnmount: true,
    fetchOnMount: true,
    params: {
      id: endpointId ?? ''
    }
  })

  const endpoint = useMemo(() => {
    if (isSuccess(endpointResp)) {
      return endpointResp.data
    }
    return null
  }, [endpointResp]);

  return null

  // const [source, setSource] = useState<typeof mockSources[0] | null>(null);
  // const [endpoint, setEndpoint] = useState<typeof mockEndpoints[keyof typeof mockEndpoints][0] | null>(null);
  //
  // useEffect(() => {
  //   // In a real application, this would be an API call
  //   if (sourceId) {
  //     const foundSource = mockSources.find(s => s.id === sourceId);
  //     if (foundSource) {
  //       setSource(foundSource);
  //
  //       if (endpointId && mockEndpoints[sourceId as keyof typeof mockEndpoints]) {
  //         const foundEndpoint = mockEndpoints[sourceId as keyof typeof mockEndpoints].find(e => e.id === endpointId);
  //         if (foundEndpoint) {
  //           setEndpoint(foundEndpoint);
  //         }
  //       }
  //     }
  //   }
  // }, [sourceId, endpointId]);
  //
  // // // If source or endpoint not found, we could redirect
  // // if (!source && sourceId) {
  // //   return <Navigate to="/" replace />;
  // // }
  // //
  // // if (!endpoint && endpointId) {
  // //   // Navigate to the source detail page instead of potentially going to homepage
  // //   return <Navigate to=".." replace />;
  // // }
  //
  // // Using react-markdown to render markdown content
  //
  // return (
  //   <div className="container mx-auto p-4 w-full flex flex-col">
  //     {source && endpoint ? (
  //       <>
  //         <div className="mb-6">
  //           <Link to={`..`} className="inline-flex items-center text-blue-600 hover:text-blue-800">
  //             <ArrowLeftIcon className="h-4 w-4 mr-1" />
  //             Back to {source.name}
  //           </Link>
  //         </div>
  //
  //         <h1 className="text-2xl font-bold mb-6">
  //           {endpoint.name}
  //         </h1>
  //
  //         <div className="mb-6">
  //           <div className="flex items-center gap-2 mb-2">
  //             <span className={`px-2 py-1 rounded-md text-white font-medium ${
  //               endpoint.method === 'GET' ? 'bg-blue-600' :
  //               endpoint.method === 'POST' ? 'bg-green-600' :
  //               endpoint.method === 'PUT' ? 'bg-yellow-600' :
  //               endpoint.method === 'DELETE' ? 'bg-red-600' : 'bg-gray-600'
  //             }`}>
  //               {endpoint.method}
  //             </span>
  //             <span className="font-mono text-sm">{endpoint.path}</span>
  //           </div>
  //           <div className="text-sm text-muted-foreground mb-4">
  //             {endpoint.description}
  //           </div>
  //         </div>
  //
  //         <div className="border rounded-lg p-6 mb-8">
  //           <h2 className="text-xl font-semibold mb-4">Documentation</h2>
  //           <div className="prose max-w-none">
  //             <ReactMarkdown>{sampleMarkdown}</ReactMarkdown>
  //           </div>
  //         </div>
  //       </>
  //     ) : (
  //       <div>Loading...</div>
  //     )}
  //   </div>
  // );
}

export default EndpointDetailPage;