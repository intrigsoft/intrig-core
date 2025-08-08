import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
// import {} from '@intrig/react/deamon_api/Sources'

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
  const handleDownload = async () => {
    if (!sourceId) return;
    
    try {
      const response = await fetch(`/api/config/sources/${sourceId}/download`);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sourceId}-openapi.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // You could add a toast notification here
    }
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