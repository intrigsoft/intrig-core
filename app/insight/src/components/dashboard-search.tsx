import * as React from "react";
import { SearchIcon } from "lucide-react";
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";

// Mock data for demonstration purposes
// In a real application, this would come from an API or state management
const mockEndpoints = [
  { id: "1", name: "User API", path: "/api/users" },
  { id: "2", name: "Products API", path: "/api/products" },
  { id: "3", name: "Orders API", path: "/api/orders" }
];

const mockDataTypes = [
  { id: "1", name: "User", fields: ["id", "name", "email"] },
  { id: "2", name: "Product", fields: ["id", "name", "price"] },
  { id: "3", name: "Order", fields: ["id", "userId", "productId", "quantity"] }
];

export function DashboardSearch() {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Filter endpoints and data types based on search query
  const filteredEndpoints = mockEndpoints.filter(endpoint => 
    endpoint.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    endpoint.path.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredDataTypes = mockDataTypes.filter(dataType => 
    dataType.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    dataType.fields.some(field => field.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center w-full gap-2 px-3 py-2 text-lg text-muted-foreground rounded-md bg-secondary"
      >
        <SearchIcon className="w-4 h-4" />
        <span>Search endpoints and data types...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search endpoints and data types..." 
          value={searchQuery}
          onValueChange={handleSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          {filteredEndpoints.length > 0 && (
            <CommandGroup heading="Endpoints">
              {filteredEndpoints.map(endpoint => (
                <CommandItem key={endpoint.id}>
                  <SearchIcon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{endpoint.name}</span>
                    <span className="text-xs text-muted-foreground">{endpoint.path}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          
          {filteredDataTypes.length > 0 && (
            <CommandGroup heading="Data Types">
              {filteredDataTypes.map(dataType => (
                <CommandItem key={dataType.id}>
                  <SearchIcon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{dataType.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Fields: {dataType.fields.join(", ")}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}