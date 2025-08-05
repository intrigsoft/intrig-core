import * as React from "react";
import { Button } from "@/components/ui/button";
import {PinIcon, PinOffIcon} from 'lucide-react'
import { LastVisitItem } from "@intrig/react/deamon_api/components/schemas/LastVisitItem";
import {useDataSearchControllerGetPinnedItems} from '@intrig/react/deamon_api/DataSearch/dataSearchControllerGetPinnedItems/useDataSearchControllerGetPinnedItems'
import {useDataSearchControllerTogglePinItemAsync} from '@intrig/react/deamon_api/DataSearch/dataSearchControllerTogglePinItem/useDataSearchControllerTogglePinItemAsync'
import {useCallback, useContext, useEffect, useMemo, useTransition} from "react";
import {isSuccess} from "@intrig/react";

interface PinContextProps {
  pinnedItems: LastVisitItem[];
  refreshPinnedItems: () => void;
}

const ctx = React.createContext<PinContextProps>({
  pinnedItems: [],
  refreshPinnedItems: () => {
    //intentionally kept empty
  },
});

export function PinContextProvider({ children }: { children: React.ReactNode }) {
  const [pinnedItems, setPinnedItems] = React.useState<LastVisitItem[]>([]);

  const [pinnedItemsResp, fetch] = useDataSearchControllerGetPinnedItems({
    clearOnUnmount: true,
    fetchOnMount: true,
    params: {
      limit: 1000,
    }
  });

  useEffect(() => {
    if (isSuccess(pinnedItemsResp)) {
      setPinnedItems(pinnedItemsResp.data)
    }
  }, [pinnedItemsResp]);

  const refreshPinnedItems = useCallback(() => {
    fetch({
      limit: 1000,
    })
  }, []);

  return <ctx.Provider value={{
    pinnedItems,
    refreshPinnedItems,
  }}>
    {children}
  </ctx.Provider>
}

interface PinButtonProps {
  item: LastVisitItem;
}

export function PinButton({ item }: PinButtonProps) {
  const {pinnedItems, refreshPinnedItems} = useContext(ctx)

  const isPinned = useMemo(() => {
    return pinnedItems.some(i => i.id === item.id && i.type === item.type);
  }, [pinnedItems, item.id, item.type]);

  const [togglePin] = useDataSearchControllerTogglePinItemAsync();

  const [isPending, startTransition] = useTransition()

  const handleClick = useCallback(() => {
    startTransition(async () => {
      await togglePin({
        id: item.id,
        type: item.type,
        source: item.source,
        name: item.name
      }, {

      });
      refreshPinnedItems();
    })
  }, [item]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="ml-2 h-6 w-6 p-0"
      onClick={handleClick}
      title={isPinned ? "Unpin" : "Pin"}
      disabled={isPending}
    >
      {isPending ? (
        <span className="h-3 w-3 animate-spin">⋯</span>
      ) : (
        isPinned ? <PinOffIcon className="h-3 w-3" /> : <PinIcon className="h-3 w-3" />
      )}
    </Button>
  );
}