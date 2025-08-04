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
import { Combobox, ComboboxOption } from "@/components/ui/combobox";

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [selectedOption, setSelectedOption] = React.useState("recent-viewed");
  
  // Options for the sidebar combobox filter
  const searchOptions: ComboboxOption[] = [
    { value: "recent-viewed", label: "Recent Viewed" },
    { value: "pinned", label: "Pinned" },
    { value: "recent-searches", label: "Recent Searches" },
  ];
  
  // Handle option change
  const handleOptionChange = (value: string) => {
    setSelectedOption(value);
    // Additional logic for filtering based on selected option can be added here
  };

  return (
    <Sidebar className="relative">
      <SidebarHeader className="relative">
        <div className="flex items-center justify-between w-full">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Logo />
          </Link>
          {!isCollapsed && (
            <SidebarTrigger className="absolute top-2 right-2" />
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="px-4 py-2">
          <DashboardSearch placeholder="Search..." />
        </div>
        <div className="px-4 py-2">
          <Combobox 
            options={searchOptions} 
            value={selectedOption}
            onValueChange={handleOptionChange}
            placeholder="Select view"
          />
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