import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {useSourcesControllerDownloadOpenApiFileDownload} from '@intrig/react/deamon_api/Sources/sourcesControllerDownloadOpenApiFile/useSourcesControllerDownloadOpenApiFileDownload'
import {useEffect} from "react";

interface SourceDownloadButtonProps {
  sourceId: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function SourceDownloadButton({ 
  sourceId, 
  variant = "outline", 
  size = "sm",
  className = "w-full"
}: SourceDownloadButtonProps) {

  const [
    sourcesControllerDownloadOpenApiFileResp,
    sourcesControllerDownloadOpenApiFile
  ] = useSourcesControllerDownloadOpenApiFileDownload({
    clearOnUnmount: true,
  });

  useEffect(() => {
    console.log(sourcesControllerDownloadOpenApiFileResp)
  }, [sourcesControllerDownloadOpenApiFileResp])

  const handleDownload = async () => {
    if (!sourceId) return;

    sourcesControllerDownloadOpenApiFile({
      id: sourceId
    })
  };

  return (
    <Button
      onClick={handleDownload}
      variant={variant}
      size={size}
      className={className}
    >
      <DownloadIcon className="h-4 w-4 mr-2" />
      Download OpenAPI File
    </Button>
  );
}