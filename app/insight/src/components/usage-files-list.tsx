import * as React from "react";
import {useState, useEffect, useMemo} from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileIcon } from "lucide-react";
import {isError, isPending, isSuccess} from "@intrig/react";
import {
  useDataSearchControllerGetFileList
} from "@intrig/react/deamon_api/DataSearch/dataSearchControllerGetFileList/useDataSearchControllerGetFileList";

export function UsageCountBadge() {
  const [fileResp] = useDataSearchControllerGetFileList();

  const count = useMemo(() => {
    if (isSuccess(fileResp)) {
      return fileResp.data.files.length
    }
    return 0
  }, []);

  if (count === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-xs font-medium">
      <FileIcon className="h-3 w-3" />
      <span>{count}</span>
    </div>
  );
}

interface UsageFilesListProps {
  sourceId: string;
  id: string;
  type: 'endpoint' | 'datatype';
}

export function UsageFilesList({ sourceId, id, type }: UsageFilesListProps) {
  const [fileResp] = useDataSearchControllerGetFileList();

  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    if (isSuccess(fileResp)) {
      setFiles(fileResp.data.files)
    }
  }, [fileResp]);

  if (isPending(fileResp)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>Loading files where this {type} is used...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError(fileResp)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>Files where this {type} is used</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-2">
            {fileResp.error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage</CardTitle>
        <CardDescription>
          {type === 'datatype'
            ? "TSX files where this datatype is used (usage will not count unless explicitly imported)"
            : "TSX files where this endpoint is used"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center text-muted-foreground py-2">
            No TSX files found using this {type}
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="px-2 py-1">
              {files.map((file, index) => {
                // Split the file path to get the filename and directory
                const parts = file.split('/');
                const fileName = parts[parts.length - 1];
                const filePath = parts.slice(0, -1).join('/');
                
                return (
                  <React.Fragment key={index}>
                    <div className="flex items-center py-2 px-2 rounded-md hover:bg-accent/50">
                      <div className="mr-2 flex-shrink-0">
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 truncate">
                        <div className="font-medium text-sm truncate">{fileName}</div>
                        <div className="text-xs text-muted-foreground truncate font-mono">
                          {filePath}
                        </div>
                      </div>
                    </div>
                    {index < files.length - 1 && <Separator className="my-1" />}
                  </React.Fragment>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

