import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUrlTabs } from '@/lib/useUrlTabs';

interface TabItem {
  value: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

interface UrlAwareTabsProps {
  defaultTab: string;
  tabs: TabItem[];
  className?: string;
  paramName?: string;
}

export function UrlAwareTabs({ 
  defaultTab, 
  tabs, 
  className = "w-full", 
  paramName = "tab" 
}: UrlAwareTabsProps) {
  const { currentTab, handleTabChange } = useUrlTabs({ 
    defaultTab, 
    paramName 
  });

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className={className}>
      <TabsList className="mb-4">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}