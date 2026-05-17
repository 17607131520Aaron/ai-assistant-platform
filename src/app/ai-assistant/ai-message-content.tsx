"use client";

import { code } from "@streamdown/code";
import { cjk } from "@streamdown/cjk";
import { Streamdown, type Components } from "streamdown";

import { cn } from "@/lib/cn";

import "./ai-markdown.css";
import "streamdown/styles.css";

const streamdownPlugins = { code, cjk };

/** 与 page.tsx 助手气泡一致的主题色 */
const theme = {
  border: "border-[#2c2b48]",
  borderSoft: "border-[#3d3a5c]",
  surfaceMuted: "bg-[#252641]",
  accent: "text-[#b58cff]",
  accentHover: "hover:text-[#c9a8ff]",
  codeText: "text-[#c4b5fd]",
} as const;

const inlineCodeClass = cn(
  "rounded px-1.5 py-0.5 font-mono text-[0.88em]",
  theme.borderSoft,
  theme.surfaceMuted,
  theme.codeText,
);

const getMarkdownShellClass = (compact?: boolean) =>
  cn(
    "w-full min-w-0 text-slate-300",
    "[&>:first-child]:mt-0 [&>:last-child]:mb-0",
    compact ? "text-xs leading-6" : "text-sm",
    /* 代码块 */
    "[&_[data-streamdown=code-block]]:my-3",
    "[&_[data-streamdown=code-block]]:rounded-lg",
    "[&_[data-streamdown=code-block]]:border",
    "[&_[data-streamdown=code-block]]:border-[#2c2b48]",
    "[&_[data-streamdown=code-block]]:bg-[#141429]",
    "[&_[data-streamdown=code-block-header]]:text-slate-500",
    "[&_[data-streamdown=code-block-body]]:bg-[#0f0f1c]",
    "[&_[data-streamdown=code-block-actions]]:border-[#2c2b48]",
    "[&_[data-streamdown=code-block-actions]]:bg-[#1a1a30]/90",
    "[&_[data-streamdown=code-block-copy-button]]:text-slate-500",
    "[&_[data-streamdown=code-block-copy-button]:hover]:text-[#b58cff]",
    /* 表格 */
    "[&_[data-streamdown=table-wrapper]]:my-3",
    "[&_[data-streamdown=table-wrapper]]:overflow-x-auto",
    "[&_[data-streamdown=table-wrapper]]:rounded-lg",
    "[&_[data-streamdown=table-wrapper]]:border",
    "[&_[data-streamdown=table-wrapper]]:border-[#2c2b48]",
    "[&_[data-streamdown=table-wrapper]]:bg-[#141429]",
    "[&_[data-streamdown=table]]:w-full",
    "[&_[data-streamdown=table]]:text-sm",
    "[&_[data-streamdown=table-header]]:bg-[#1e1e36]",
    "[&_[data-streamdown=table-header-cell]]:text-slate-200",
    "[&_[data-streamdown=table-cell]]:text-slate-300",
  );

const assistantMarkdownComponents: Components = {
  h1: ({ children, className, ...props }) => (
    <h1
      className={cn(
        "mt-4 mb-2 border-b pb-2 text-lg font-semibold text-slate-100",
        theme.border,
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, className, ...props }) => (
    <h2
      className={cn("mt-4 mb-2 text-base font-semibold text-slate-100", className)}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, className, ...props }) => (
    <h3
      className={cn("mt-3 mb-1.5 text-sm font-semibold text-slate-200", className)}
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, className, ...props }) => (
    <h4
      className={cn("mt-3 mb-1 text-sm font-medium text-slate-200", className)}
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ children, className, ...props }) => (
    <h5
      className={cn("mt-2 mb-1 text-sm font-medium text-slate-300", className)}
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, className, ...props }) => (
    <h6
      className={cn("mt-2 mb-1 text-xs font-medium text-slate-400", className)}
      {...props}
    >
      {children}
    </h6>
  ),
  p: ({ children, className, ...props }) => (
    <p className={cn("my-1.5 leading-7 text-slate-300", className)} {...props}>
      {children}
    </p>
  ),
  strong: ({ children, className, ...props }) => (
    <strong className={cn("font-semibold text-slate-100", className)} {...props}>
      {children}
    </strong>
  ),
  em: ({ children, className, ...props }) => (
    <em className={cn("text-slate-200", className)} {...props}>
      {children}
    </em>
  ),
  a: ({ children, className, ...props }) => (
    <a
      className={cn(
        "font-medium underline decoration-[#6d55c8]/50 underline-offset-2",
        theme.accent,
        theme.accentHover,
        className,
      )}
      {...props}
    >
      {children}
    </a>
  ),
  blockquote: ({ children, className, ...props }) => (
    <blockquote
      className={cn(
        "my-2 border-l-2 border-[#6d55c8]/60 bg-[#1f1d35]/50 py-0.5 pl-3 text-slate-400 not-italic",
        className,
      )}
      {...props}
    >
      {children}
    </blockquote>
  ),
  ul: ({ children, className, ...props }) => (
    <ul
      className={cn("my-1.5 list-disc space-y-0.5 pl-5 leading-7 text-slate-300", className)}
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, className, ...props }) => (
    <ol
      className={cn(
        "my-1.5 list-decimal space-y-0.5 pl-5 leading-7 text-slate-300",
        className,
      )}
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, className, ...props }) => (
    <li className={cn("py-0.5 [&>p]:my-0.5", className)} {...props}>
      {children}
    </li>
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn("my-3", theme.border, className)} {...props} />
  ),
  inlineCode: ({ children, className, ...props }) => (
    <code className={cn(inlineCodeClass, className)} {...props}>
      {children}
    </code>
  ),
  thead: ({ children, className, ...props }) => (
    <thead className={cn("bg-[#1e1e36]", className)} {...props}>
      {children}
    </thead>
  ),
  th: ({ children, className, ...props }) => (
    <th
      className={cn(
        "px-3 py-2 text-left text-sm font-medium text-slate-200",
        theme.border,
        "border-b",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, className, ...props }) => (
    <td
      className={cn(
        "border-b border-[#2c2b48]/60 px-3 py-2 text-sm text-slate-300",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  ),
  tr: ({ children, className, ...props }) => (
    <tr className={cn("even:bg-[#1a1a30]/40", className)} {...props}>
      {children}
    </tr>
  ),
  img: ({ className, alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={cn("my-2 max-w-full rounded-lg border", theme.border, className)}
      alt={alt ?? ""}
      {...props}
    />
  ),
};

type AiMessageContentProps = {
  content: string;
  isStreaming?: boolean;
  placeholder?: string;
  compact?: boolean;
};

const AiMessageContent = ({
  content,
  isStreaming = false,
  placeholder,
  compact = false,
}: AiMessageContentProps) => {
  if (!content.trim()) {
    if (!placeholder) {
      return null;
    }

    return <p className="text-sm text-slate-500">{placeholder}</p>;
  }

  return (
    <div className={getMarkdownShellClass(compact)}>
      <Streamdown
        mode={isStreaming ? "streaming" : "static"}
        isAnimating={isStreaming}
        parseIncompleteMarkdown={isStreaming}
        plugins={streamdownPlugins}
        components={assistantMarkdownComponents}
        shikiTheme={["vitesse-dark", "vitesse-dark"]}
        controls={{ code: true, table: true }}
        className="min-w-0"
        translations={{
          copyCode: "复制代码",
          copied: "已复制",
          copyTable: "复制表格",
          copyTableAsMarkdown: "复制为 Markdown",
          copyTableAsCsv: "复制为 CSV",
          copyTableAsTsv: "复制为 TSV",
        }}
      >
        {content}
      </Streamdown>
    </div>
  );
};

export default AiMessageContent;
