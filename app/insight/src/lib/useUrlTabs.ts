import { useSearchParams } from 'react-router-dom';

interface UseUrlTabsOptions {
  defaultTab: string;
  paramName?: string;
}

export function useUrlTabs({ defaultTab, paramName = 'tab' }: UseUrlTabsOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get current tab from URL or use default
  const currentTab = searchParams.get(paramName) || defaultTab;
  
  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set(paramName, value);
    setSearchParams(newParams);
  };
  
  return {
    currentTab,
    handleTabChange,
  };
}