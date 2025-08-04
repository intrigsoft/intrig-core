import * as React from "react";
import { Outlet } from "react-router-dom";

import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import ErrorBoundary from "@/components/error-boundary";

function SidebarTriggerWrapper() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  
  return (
    <>
      {/* Trigger for mobile devices */}
      <SidebarTrigger className="fixed bottom-4 right-4 md:hidden" />
      
      {/* Trigger for desktop - only shown when sidebar is collapsed */}
      {isCollapsed && (
        <SidebarTrigger className="fixed top-4 left-4 z-20 hidden md:flex" />
      )}
    </>
  );
}

export function SidebarLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-4 w-full h-full overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <SidebarTriggerWrapper />
    </SidebarProvider>
  );
}