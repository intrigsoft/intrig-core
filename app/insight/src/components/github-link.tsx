import * as React from "react";
import githubMarkDark from "../assets/github-mark.svg";
import githubMarkLight from "../assets/github-mark-white.svg";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function GitHubLink() {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  
  React.useEffect(() => {
    // Check initial theme
    setIsDarkMode(document.documentElement.classList.contains("dark"));
    
    // Set up observer to detect theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          setIsDarkMode(document.documentElement.classList.contains("dark"));
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8"
          >
            <a
              href="https://github.com/intrigsoft/intrig-core"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img 
                src={isDarkMode ? githubMarkLight : githubMarkDark} 
                alt="GitHub" 
                className="h-5 w-5" 
              />
              <span className="sr-only">GitHub</span>
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>GitHub</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}