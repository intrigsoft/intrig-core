import * as React from "react";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BracesIcon, Link2Icon, ServerIcon } from "lucide-react";
import {useDataSearchControllerGetLastVisitedItems} from '@intrig/react/deamon_api/DataSearch/dataSearchControllerGetLastVisitedItems/client'
import {useLocation} from "react-router-dom";
import {isSuccess} from "@intrig/react";
import {LastVisitItem} from "@intrig/react/deamon_api/components/schemas/LastVisitItem";
import { PinButton } from "@/components/pin-button";

export function RecentComponentsList() {

  const {pathname} = useLocation();

  const [itemsResp, fetch] = useDataSearchControllerGetLastVisitedItems({
    clearOnUnmount: true,
    fetchOnMount: true,
    params: {
      limit: 20,
    }
  });

  const [items, setItems] = useState<LastVisitItem[]>([]);

  useEffect(() => {
    if (isSuccess(itemsResp)) {
      setItems(itemsResp.data)
    }
  }, [itemsResp]);

  useEffect(() => {
    fetch({
      limit: 20,
    })
  }, [pathname]);

  if (items.length === 0) {
    return (
      <ScrollArea className="h-[calc(100vh-250px)] w-full">
        <div className="p-4 text-center text-muted-foreground">
          No recently viewed components.
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-250px)] w-full">
      <div className="px-2 py-1">
        {items.map((item, index) => (
          <React.Fragment key={`${item.type}-${item.id}`}>
            <div className="flex items-center py-2 px-2 hover:bg-accent/50 rounded-md relative w-[85%] group" >
              {/* Icon based on item type */}
              <div className="mr-2 flex-shrink-0">
                {item.type === "schema" && <BracesIcon className="h-4 w-4 text-muted-foreground" />}
                {item.type === "endpoint" && <Link2Icon className="h-4 w-4 text-muted-foreground" />}
                {!["schema", "endpoint"].includes(item.type) && <ServerIcon className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 truncate">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <div className="font-medium text-sm truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {item.type} • {item.source}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{item.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <PinButton item={item} />
              </div>
            </div>
            {index < items.length - 1 && <Separator className="my-1" />}
          </React.Fragment>
        ))}
      </div>
    </ScrollArea>
  );
}