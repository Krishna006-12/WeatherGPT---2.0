"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownContentProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

const ALLOWED_ELEMENTS = [
  "p",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "br",
  "span",
  "code",
];

export function MarkdownContent({ content, className = "", style }: MarkdownContentProps) {
  return (
    <div
      className={`text-[14px] leading-relaxed font-medium ${className}`}
      style={style}
    >
      <ReactMarkdown
        allowedElements={ALLOWED_ELEMENTS}
        skipHtml={true}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-bold text-[var(--text-primary)] dark:text-neutral-100 bg-neutral-200/50 dark:bg-white/10 px-1 py-0.5 rounded tracking-tight">
              {children}
            </strong>
          ),
          b: ({ children }) => (
            <strong className="font-bold text-[var(--text-primary)] dark:text-neutral-100 bg-neutral-200/50 dark:bg-white/10 px-1 py-0.5 rounded tracking-tight">
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic text-[var(--text-secondary)]">{children}</em>,
          i: ({ children }) => <i className="italic text-[var(--text-secondary)]">{children}</i>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-800 font-mono text-[13px] text-emerald-600 dark:text-emerald-400">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
