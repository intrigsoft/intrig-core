import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileJson, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { useDataSearchControllerGetSchemaDocsById } from '@intrig/react/daemon_api/DataSearch/dataSearchControllerGetSchemaDocsById/useDataSearchControllerGetSchemaDocsById';
import { isSuccess, isPending, isError } from "@intrig/react";

interface SchemaViewButtonProps {
  schemaId: string;
  schemaName: string;
  sourceId: string;
  buttonText?: string;
}

export function SchemaViewButton({ 
  schemaId, 
  schemaName, 
  sourceId, 
  buttonText = "View Model Schema" 
}: SchemaViewButtonProps) {
  const [open, setOpen] = useState(false);
  const [resp, fetch] = useDataSearchControllerGetSchemaDocsById({
    clearOnUnmount: true,
    fetchOnMount: false,
    params: {
      id: schemaId
    }
  });

  const handlePopoverOpen = (openState: boolean) => {
    setOpen(openState);
    if (openState) {
      fetch({
        id: schemaId
      });
    }
  };

  const data = React.useMemo(() => {
    if (isSuccess(resp)) {
      return resp.data;
    }
    return null;
  }, [resp]);

  return (
    <div className="flex">
      <Popover open={open} onOpenChange={handlePopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-r-none border-r-0">
            <FileJson className="mr-2 h-4 w-4" />
            {buttonText}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="start">
          {isPending(resp) && (
            <div className="p-4 space-y-2">
              <div className="h-4 w-48 bg-muted rounded animate-pulse"/>
              <div className="h-8 w-96 bg-muted rounded animate-pulse"/>
              <div className="h-4 w-72 bg-muted rounded animate-pulse"/>
            </div>
          )}
          
          {isError(resp) && (
            <div className="p-4">
              <p className="text-destructive">Failed to load schema data</p>
            </div>
          )}
          
          {data && (
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">{data.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{data.description}</p>
              
              {data.tabs && data.tabs.length > 0 && (
                <Tabs defaultValue={data.tabs[0].name} className="w-full">
                  <TabsList className="mb-4">
                    {data.tabs.map(tab => (
                      <TabsTrigger key={tab.name} value={tab.name}>{tab.name}</TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {data.tabs.map(tab => (
                    <TabsContent key={tab.name} value={tab.name} className="mt-0">
                      <Card>
                        <CardContent className="pt-6">
                          <MarkdownRenderer content={tab.content.trim()} />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
      <Button variant="outline" size="sm" className="rounded-l-none px-2" asChild>
        <Link to={`/sources/${sourceId}/datatype/${schemaId}`} rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export default SchemaViewButton;