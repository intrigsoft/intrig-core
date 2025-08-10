import React, { useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
// import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import rehypePrism from 'rehype-prism-plus';
import { ClipboardCopy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import hljs from 'highlight.js/lib/core';

// Import common languages for syntax highlighting
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import csharp from 'highlight.js/lib/languages/csharp';

// Register languages
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('cs', csharp);

// Register TSX and JSX support
hljs.registerLanguage('tsx', typescript); // TSX uses TypeScript syntax with JSX
hljs.registerLanguage('jsx', javascript); // JSX uses JavaScript syntax with JSX

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  /*useEffect(() => {
    document
      .querySelectorAll("link[data-hljs-theme]")
      .forEach(el => el.remove());

    const isDarkMode = document.documentElement.classList.contains('dark');
    const sheet = isDarkMode ? "github-dark" : "github";

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `/node_modules/highlight.js/styles/${sheet}.css`;
    link.setAttribute("data-hljs-theme", "true");
    document.head.appendChild(link);
    
    return () => {
      document
        .querySelectorAll("link[data-hljs-theme]")
        .forEach(el => el.remove());
    };
  }, [])*/;

  return (
    <div className={cn("markdown-renderer prose dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypePrism /*[rehypeHighlight, { detect: true, ignoreMissing: true }]*/]}
        components={{
          pre: ({ node, ...props }) => {
            const ref = useRef<HTMLPreElement>(null);
            const [isCopied, setIsCopied] = useState(false);
            return (
              <div className="relative group">
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm my-4" {...props} ref={ref} />
                <button
                  className="absolute top-3 right-3 bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-border"
                  onClick={() => {
                    const code = ref.current?.innerText;
                    if (code) {
                      navigator.clipboard.writeText(code);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }
                  }}
                  aria-label={isCopied ? "Copied" : "Copy code"}
                  title={isCopied ? "Copied" : "Copy code"}
                >
                  {isCopied ? <Check className="h-4 w-4"/> : <ClipboardCopy className="h-4 w-4"/>}
                </button>
              </div>
            );
          },
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
              <code className={className} {...props}>
                {children}
              </code>
            ) : (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
          a: ({ node, ...props }) => <a className="text-primary underline hover:text-primary/80" {...props} />,
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold tracking-tight mt-8 mb-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold tracking-tight mt-8 mb-4" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-bold tracking-tight mt-6 mb-3" {...props} />,
          h4: ({ node, ...props }) => <h4 className="text-sm font-bold tracking-tight mt-4 mb-2 underline" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-4" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-4" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-4" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6">
              <table className="w-full border-collapse" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="border border-border px-4 py-2 text-left font-bold bg-muted" {...props} />
          ),
          td: ({ node, ...props }) => <td className="border border-border px-4 py-2" {...props} />,
          summary: ({ node, ...props }) => <summary className="text-lg font-bold tracking-tight mt-1 mb-1 cursor-pointer hover:text-primary transition-colors" {...props} />,
          details: ({ node, ...props }) => <details className="border rounded-md border-border my-4 p-4 bg-muted/20 hover:bg-muted/30 transition-colors shadow-sm" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}