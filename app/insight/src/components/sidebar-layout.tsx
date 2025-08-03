import * as React from "react";
import { Outlet } from "react-router-dom";

import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export function SidebarLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-4 w-full h-full overflow-auto">
          <Outlet />
        </main>
      </div>
      <SidebarTrigger className="fixed bottom-4 right-4 md:hidden" />
    </SidebarProvider>
  );
}