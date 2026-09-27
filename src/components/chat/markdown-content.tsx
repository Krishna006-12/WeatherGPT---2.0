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
  "pre",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
];

export function MarkdownContent({ content, className = "", style }: MarkdownContentProps) {
  // Output format integrity: Strip raw JSON wrappers, unescape double-escaped newlines
  let cleanContent = content || "";

  // 1. Strip outer code fences if wrapping an entire JSON response
  const outerFenceMatch = cleanContent.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (outerFenceMatch && outerFenceMatch[1]) {
    const inner = outerFenceMatch[1].trim();
    if (inner.startsWith("{") && inner.endsWith("}")) {
      cleanContent = inner;
    }
  }

  // 2. Strip JSON wrapper syntax if present (e.g. {"answer": "..."})
  if (cleanContent.startsWith("{") && cleanContent.includes('"answer"')) {
    try {
      const parsed = JSON.parse(cleanContent);
      if (parsed && typeof parsed.answer === "string") {
        cleanContent = parsed.answer;
      }
    } catch {
      const m = cleanContent.match(/"answer"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (m && m[1]) {
        try {
          cleanContent = JSON.parse(`"${m[1]}"`);
        } catch {
          cleanContent = m[1];
        }
      }
    }
  }

  // 3. Unescape literal \n if double escaped
  if (cleanContent.includes("\\n") && !cleanContent.includes("\n")) {
    cleanContent = cleanContent.replace(/\\n/g, "\n");
  } else if (cleanContent.includes("\\r\\n")) {
    cleanContent = cleanContent.replace(/\\r\\n/g, "\n");
  }

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
          pre: ({ children }) => (
            <pre className="p-3 my-2.5 rounded-xl bg-neutral-900/90 dark:bg-black/60 border border-[var(--border-subtle)] text-neutral-100 overflow-x-auto font-mono text-[13px] leading-snug shadow-inner">
              {children}
            </pre>
          ),
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-800 font-mono text-[13px] text-emerald-600 dark:text-emerald-400">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-cyan-500/60 pl-3 my-2 italic text-[var(--text-secondary)]">
              {children}
            </blockquote>
          ),
          h1: ({ children }) => <h1 className="text-base font-bold my-2 text-[var(--text-primary)]">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold my-1.5 text-[var(--text-primary)]">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold my-1 text-[var(--text-primary)]">{children}</h3>,
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}
