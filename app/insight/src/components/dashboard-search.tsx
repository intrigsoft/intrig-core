import * as React from "react";
import { SearchIcon, BracesIcon, Link2Icon } from "lucide-react";
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import {useDataSearchControllerSearch} from '@intrig/react/deamon_api/DataSearch/dataSearchControllerSearch/useDataSearchControllerSearch'
import {isSuccess} from '@intrig/react'
import {useDebounceState} from "@/lib/useDebounceState";
import {useEffect} from "react";
import {ResourceDescriptor} from "@intrig/react/deamon_api/components/schemas/ResourceDescriptor";
import { Link } from "react-router-dom";

// Interface for search result data items
interface DashboardSearchProps {
  placeholder?: string;
  source?: string;
}

export function DashboardSearch({ placeholder = "Search endpoints and data types...", source }: DashboardSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery, debouncedSearchQuery] = useDebounceState("", 300);

  const [searchResult, search] = useDataSearchControllerSearch({
    clearOnUnmount: true
  });

  useEffect(() => {
    if (debouncedSearchQuery) {
      search({
        query: debouncedSearchQuery,
        page: 1,
        size: 10,
        source
      })
    } else {
      // Clear results when search query is empty
      setItems([]);
    }
  }, [debouncedSearchQuery])

  // Process search results when they arrive
  const [items, setItems] = React.useState<ResourceDescriptor[]>([]);


  useEffect(() => {
    if (isSuccess(searchResult) && searchResult.data) {
      // Set all items at once
      setItems(searchResult.data.data ?? []);
    }
  }, [searchResult]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  // Memoize filtered items to avoid duplicate filtering
  const restItems = React.useMemo(() =>
    items.filter(item => item.type === "rest"),
    [items]
  );

  const schemaItems = React.useMemo(() =>
    items.filter(item => item.type === "schema"),
    [items]
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center w-full gap-2 px-3 py-2 text-lg text-muted-foreground rounded-md bg-secondary"
      >
        <SearchIcon className="w-4 h-4" />
        <span>{placeholder}</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      
      <CommandDialog open={open} onOpenChange={setOpen} className="fixed w-[500px] h-[700px]">
        <CommandInput 
          placeholder={placeholder} 
          value={searchQuery}
          onValueChange={handleSearch}
        />
        <CommandList className="h-[650px] max-h-[650px] overflow-y-auto">
          <CommandEmpty>No results found.</CommandEmpty>
          
          {/* REST APIs section */}
          {restItems.length > 0 && (
            <CommandGroup heading="REST APIs">
              {restItems.map(item => (
                <CommandItem 
                  key={item.id} 
                  value={item.name}
                  onSelect={() => {
                    setOpen(false);
                  }}
                >
                  <Link 
                    to={`/sources/${item.source}/endpoint/${item.id}`}
                    className="flex items-center w-full"
                  >
                    <Link2Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col w-full">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{item.name}</span>
                        {item.data?.method && (
                          <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                            item.data.method.toLowerCase() === 'get' 
                              ? 'bg-blue-100 text-blue-700' 
                              : item.data.method.toLowerCase() === 'post'
                              ? 'bg-green-100 text-green-700'
                              : item.data.method.toLowerCase() === 'put'
                              ? 'bg-amber-100 text-amber-700'
                              : item.data.method.toLowerCase() === 'delete'
                              ? 'bg-red-100 text-red-700'
                              : item.data.method.toLowerCase() === 'patch'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {item.data.method.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {item.data?.requestUrl || item.path}
                      </span>
                      {item.data?.summary && (
                        <span className="text-xs text-muted-foreground mt-1">
                          {item.data.summary}
                        </span>
                      )}
                    </div>
                  </Link>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          
          {/* Schemas section */}
          {schemaItems.length > 0 && (
            <CommandGroup heading="Schemas">
              {schemaItems.map(item => (
                <CommandItem 
                  key={item.id} 
                  value={item.name}
                  onSelect={() => {
                    setOpen(false);
                  }}
                >
                  <Link 
                    to={`/sources/${item.source}/datatype/${item.id}`}
                    className="flex items-center w-full"
                  >
                    <BracesIcon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col w-full">
                      <span className="font-medium">{item.name}</span>
                      {item.data?.schema?.properties && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <div className="flex flex-wrap gap-1">
                            {Object.keys(item.data.schema.properties).map((key) => (
                              <span key={key} className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                                {key}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
        
        {/* Footer with keyboard shortcuts */}
        <div className="border-t py-2">
          <CommandSeparator />
          <div className="flex justify-between px-4 pt-2 text-xs text-muted-foreground">
            <div className="flex items-center">
              <kbd className="mr-1 rounded border bg-muted px-1.5 font-mono">Enter</kbd>
              <span>to select</span>
            </div>
            <div className="flex items-center">
              <kbd className="mr-1 rounded border bg-muted px-1.5 font-mono">↑</kbd>
              <kbd className="mx-1 rounded border bg-muted px-1.5 font-mono">↓</kbd>
              <span>to navigate</span>
            </div>
            <div className="flex items-center">
              <kbd className="mr-1 rounded border bg-muted px-1.5 font-mono">Esc</kbd>
              <span>to close</span>
            </div>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}