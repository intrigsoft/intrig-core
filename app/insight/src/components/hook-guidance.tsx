import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useState } from "react";

export function HookGuidance() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <CardTitle className="text-lg flex items-center gap-2">
                Which hook should I use?
                <Info className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-3">
        <div className="space-y-2 text-sm">
          <p>
            <strong>Need shared, persistent data you can read in multiple places or later renders?</strong> → <strong>Stateful hook</strong> (this page).
          </p>
          <p>
            <strong>One-off action (validate / submit / update) with no shared state?</strong> → <strong>Async hook</strong> (<code className="text-xs bg-muted px-1 py-0.5 rounded">useGetUserAsync</code>).
          </p>
          <p>
            <strong>Unsure?</strong> If you'll <strong>render the result later</strong> or <strong>elsewhere</strong>, choose <strong>Stateful</strong>; if you just need a value <strong>now</strong>, choose <strong>Async</strong>.
          </p>
        </div>
        
        <div className="overflow-hidden border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2 font-medium">Need</th>
                <th className="text-left p-2 font-medium">Use</th>
                <th className="text-left p-2 font-medium">Examples</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              <tr>
                <td className="p-2">Shared "single source of truth"</td>
                <td className="p-2 font-medium">Stateful</td>
                <td className="p-2">
                  <code className="bg-muted px-1 py-0.5 rounded">getUser</code>,{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">getProduct</code>,{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">searchProducts</code>
                </td>
              </tr>
              <tr>
                <td className="p-2">One-off action</td>
                <td className="p-2 font-medium">Async</td>
                <td className="p-2">
                  <code className="bg-muted px-1 py-0.5 rounded">validateEmail</code>,{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">submitForm</code>,{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">updateCartItem</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
}