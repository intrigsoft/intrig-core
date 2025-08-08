import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { GitHubLink } from "@/components/github-link";
import { DashboardSearch } from "@/components/dashboard-search";
import { Link } from "react-router-dom";
import { RecentComponentsList } from "@/components/recent-components-list";
import { PinnedComponentsList } from "@/components/pinned-components-list";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Clock, Pin, Search } from "lucide-react";

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [selectedOption, setSelectedOption] = React.useState("recent-viewed");

  return (
    <Sidebar className="relative">
      <SidebarHeader className="relative">
        <div className="flex items-center justify-between w-full">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }} className="flex items-center">
            <Logo />
          </Link>
          {!isCollapsed && (
            <SidebarTrigger className="absolute top-5 right-2" />
          )}
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <div className="px-4 py-2">
          <DashboardSearch placeholder="Search..." />
        </div>
        <div className="px-4 py-2">
          <Tabs value={selectedOption} onValueChange={setSelectedOption} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="recent-viewed" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="pinned" className="flex items-center gap-1">
                <Pin className="h-4 w-4" />
              </TabsTrigger>
              {/*<TabsTrigger value="recent-searches" className="flex items-center gap-1">*/}
              {/*  <Search className="h-4 w-4" />*/}
              {/*</TabsTrigger>*/}
            </TabsList>
            
            <TabsContent value="recent-viewed">
              <RecentComponentsList/>
            </TabsContent>
            <TabsContent value="pinned">
              <PinnedComponentsList/>
            </TabsContent>
            <TabsContent value="recent-searches">
              <div className="p-4 text-center text-gray-500">
                Recent searches feature coming soon.
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <div className="flex items-center justify-between px-2">
          <ThemeSwitch />
          <GitHubLink />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}