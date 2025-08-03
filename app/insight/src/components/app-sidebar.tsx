import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { GitHubLink } from "@/components/github-link";
import { SearchBox } from "@/components/search-box";

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <div className="px-4 py-2">
          <SearchBox />
        </div>
        {/* Sidebar links removed as requested */}
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