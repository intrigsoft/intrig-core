import {useEffect, useMemo, useState} from 'react';
import { Link } from 'react-router-dom';
import { BracesIcon, SearchIcon } from 'lucide-react';
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

interface DataTypesTabProps {
  datatypes?: any[];
  sourceId?: string;
}

export function DataTypesTab({ datatypes = [], sourceId }: DataTypesTabProps) {
  const [searchQuery, setSearchQuery, debouncedSearchQuery] = useDebounceState('', 300);
  const [page, setPage] = useState(1);

  const [searchResult, search] = useDataSearchControllerSearch({
    clearOnUnmount: true,
    fetchOnMount: true,
    params: {
      source: sourceId,
      type: 'schema',
      query: debouncedSearchQuery,
      page: page,
      size: 12,
    },
    key: 'datatype',
  });

  useEffect(() => {
    search({
      source: sourceId,
      type: 'schema',
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
          placeholder="Search data types..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Data types grid with responsive layout - 2x6 for md, 3x4 for lg, 4x3 for xl */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {results?.data?.map(schema => (
          <Link 
            key={schema.id} 
            to={`datatype/${schema.id}`}
            className="block no-underline text-inherit"
          >
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 hover:shadow-md transition-shadow h-full flex flex-col relative">
              <div className="pb-2">
                <h3 className="text-sm font-medium tracking-tight break-words">{schema.name}</h3>
              </div>
              
              {/* Show properties as tags */}
              {schema.data?.schema?.properties && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {Object.keys(schema.data.schema.properties).slice(0, 5).map((key) => (
                    <span key={key} className="px-2 py-0.5 text-xs rounded-md bg-secondary text-secondary-foreground">
                      {key}
                    </span>
                  ))}
                  {Object.keys(schema.data.schema.properties).length > 5 && (
                    <span className="px-2 py-0.5 text-xs rounded-md bg-secondary text-secondary-foreground">
                      +{Object.keys(schema.data.schema.properties).length - 5} more
                    </span>
                  )}
                </div>
              )}
              
              <div className="text-xs text-muted-foreground line-clamp-3 overflow-hidden">
                {schema.data?.description}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {results?.data?.length === 0 && (
        <div className="text-center py-8">
          <BracesIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-2 text-lg font-semibold">No data types found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? 'Try a different search term' : 'No data types available for this source'}
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

export default DataTypesTab;