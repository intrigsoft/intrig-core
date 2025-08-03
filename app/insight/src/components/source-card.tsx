import * as React from "react";
import { FileJson, ServerIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface SourceCardProps {
  name: string;
  id: string;
  specUrl: string;
  isOpenApi?: boolean;
}

export function SourceCard({ name, id, specUrl, isOpenApi = false }: SourceCardProps) {
  return (
    <Link to={`/sources/${id}`} className="block no-underline text-inherit">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium tracking-tight">{name}</h3>
          {isOpenApi && (
            <div className="text-blue-500" title="OpenAPI Source">
              <ServerIcon className="h-4 w-4" />
            </div>
          )}
          {!isOpenApi && (
            <div className="text-muted-foreground" title="Source">
              <FileJson className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground mb-2">ID: {id}</div>
        <div className="text-xs text-muted-foreground truncate" title={specUrl}>
          {specUrl}
        </div>
      </div>
    </Link>
  );
}