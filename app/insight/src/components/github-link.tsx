import * as React from "react";
import { Github } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function GitHubLink() {
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
              <Github className="h-4 w-4" />
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