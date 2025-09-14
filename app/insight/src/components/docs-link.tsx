import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookOpen } from "lucide-react";

export function DocsLink() {
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
              href="https://intrig.dev"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Documentation"
            >
              <BookOpen className="h-5 w-5" />
              <span className="sr-only">Documentation</span>
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Documentation</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
