import {useEffect, useMemo, useState} from 'react';
import { Link } from 'react-router-dom';
import { Link2Icon, SearchIcon, UploadIcon, FileTextIcon, DownloadIcon, RadioIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {useDebounceState} from "@/lib/useDebounceState";
import {
  useDataSearchControllerSearch
} from "@intrig/react/deamon_api/DataSearch/dataSearchControllerSearch/useDataSearchControllerSearch";
import {isSuccess} from "@intrig/react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {constantCase} from "change-case";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EndpointsTabProps {
  sourceId?: string;
}

export function EndpointsTab({ sourceId }: EndpointsTabProps) {
  const [searchQuery, setSearchQuery, debouncedSearchQuery] = useDebounceState('', 300);
  const [page, setPage] = useState(1)

  const [searchResult, search] = useDataSearchControllerSearch({
    clearOnUnmount: true,
    fetchOnMount: true,
    params: {
      source: sourceId,
      type: 'rest',
      query: debouncedSearchQuery,
      page: page,
      size: 12,
    },
    key: 'endpoint',
  });

  useEffect(() => {
    search({
      source: sourceId,
      type: 'rest',
      query: debouncedSearchQuery,
      page: page,
      size: 12,
    })
  }, [debouncedSearchQuery, page]);

  const results = useMemo(() => {
    if (isSuccess(searchResult)) {
      return searchResult.data
    }
    return null
  }, [searchResult]);

  return (
    <div className="w-full">
      {/* Search box */}
      <div className="mb-4 relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search endpoints..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Endpoints grid with responsive layout - 2x6 for md, 3x4 for lg, 4x3 for xl */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {results?.data?.map(endpoint => (
          <Link 
            key={endpoint.id} 
            to={`endpoint/${endpoint.id}`}
            className="block no-underline text-inherit"
          >
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 hover:shadow-md transition-shadow h-full flex flex-col relative">
              <span className={`absolute top-2 right-2 px-2 py-1 text-xs rounded-md text-white font-medium ${
                constantCase(endpoint.data.method) === 'GET' ? 'bg-blue-600' : 
                constantCase(endpoint.data.method) === 'POST' ? 'bg-green-600' : 
                constantCase(endpoint.data.method) === 'PUT' ? 'bg-yellow-600' : 
                constantCase(endpoint.data.method) === 'DELETE' ? 'bg-red-600' : 'bg-gray-600'
              }`}>
                {constantCase(endpoint.data.method)}
              </span>
              <div className="pb-2 pr-16">
                <h3 className="text-sm font-medium tracking-tight break-words">{endpoint.name}</h3>
              </div>
              <div className="text-xs font-mono mb-2 break-all">
                {endpoint.data.requestUrl || endpoint.path}
              </div>
              <div className="text-xs text-muted-foreground line-clamp-3 overflow-hidden">
                {endpoint.data.summary || endpoint.data.description}
              </div>
              
              {/* Badges */}
              <div className="absolute bottom-2 right-2 flex gap-1">
                <TooltipProvider>
                  {/* Upload badge for multipart/form-data */}
                  {endpoint.data.contentType?.includes('multipart/form-data') && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-1 rounded-md bg-purple-100 text-purple-700">
                          <UploadIcon className="h-3 w-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Multipart Form Data</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {/* Form badge for application/x-www-form-urlencoded */}
                  {endpoint.data.contentType?.includes('application/x-www-form-urlencoded') && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-1 rounded-md bg-blue-100 text-blue-700">
                          <FileTextIcon className="h-3 w-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Form URL Encoded</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {/* SSE badge for text/event-stream */}
                  {endpoint.data.responseType?.includes('text/event-stream') && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-1 rounded-md bg-green-100 text-green-700">
                          <RadioIcon className="h-3 w-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>SSE (Server-Sent Events)</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {/* Download badge for downloadable content */}
                  {(endpoint.data.responseType?.includes('application/octet-stream') || 
                   endpoint.data.responseType?.includes('application/pdf') ||
                   endpoint.data.responseType?.includes('application/zip') ||
                   endpoint.data.responseType?.includes('application/x-msdownload') ||
                   endpoint.data.responseType?.includes('application/vnd.ms-excel') ||
                   endpoint.data.responseType?.includes('application/vnd.openxmlformats-officedocument')) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-1 rounded-md bg-amber-100 text-amber-700">
                          <DownloadIcon className="h-3 w-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Downloadable Content</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {results?.data?.length === 0 && (
        <div className="text-center py-8">
          <Link2Icon className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-2 text-lg font-semibold">No endpoints found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? 'Try a different search term' : 'No endpoints available for this source'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {results && results.totalPages > 1 && (
        <div className="mt-8">
          <Pagination>
            <PaginationContent>
              {results.hasPrevious && <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(page => Math.max(1, page - 1))}
                  style={{ cursor: results.hasPrevious ? 'pointer' : 'not-allowed' }}
                />
              </PaginationItem>}
              
              {/* First page */}
              {page > 2 && (
                <PaginationItem>
                  <PaginationLink onClick={() => setPage(1)} isActive={page === 1}>
                    1
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Ellipsis if needed */}
              {page > 3 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              {/* Previous page if not first */}
              {page > 1 && (
                <PaginationItem>
                  <PaginationLink onClick={() => setPage(page - 1)}>
                    {page - 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Current page */}
              <PaginationItem>
                <PaginationLink isActive>{page}</PaginationLink>
              </PaginationItem>
              
              {/* Next page if not last */}
              {page < results.totalPages && (
                <PaginationItem>
                  <PaginationLink onClick={() => setPage(page + 1)}>
                    {page + 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Ellipsis if needed */}
              {page < results.totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              {/* Last page */}
              {page < results.totalPages - 1 && (
                <PaginationItem>
                  <PaginationLink onClick={() => setPage(results.totalPages)}>
                    {results.totalPages}
                  </PaginationLink>
                </PaginationItem>
              )}
              {results.hasNext && <PaginationItem>
                <PaginationNext
                  onClick={() => setPage(page => Math.min(results.totalPages, page + 1))}
                  style={{ cursor: results.hasNext ? 'pointer' : 'not-allowed' }}
                />
              </PaginationItem>}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

export default EndpointsTab;