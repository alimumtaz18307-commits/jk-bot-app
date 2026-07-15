import React from "react";

export function Markdown({ content }: { content: string }) {
  return <div className="markdown-content">{renderMarkdown(content)}</div>;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent = "";
  let listItems: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;

  lines.forEach((line, i) => {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        nodes.push(<pre key={`code-${i}`}><code>{codeContent}</code></pre>);
        inCodeBlock = false; codeContent = "";
      } else { inCodeBlock = true; }
      return;
    }
    if (inCodeBlock) { codeContent += (codeContent ? "\n" : "") + line; return; }

    if (listType && !line.trim().startsWith("-") && !line.trim().startsWith("*") && !/^\d+\./.test(line.trim())) {
      if (listType === "ul") nodes.push(<ul key={`list-${i}`}>{listItems}</ul>);
      else nodes.push(<ol key={`list-${i}`}>{listItems}</ol>);
      listItems = []; listType = null;
    }

    if (line.startsWith("### ")) { nodes.push(<h3 key={i}>{inline(line.slice(4))}</h3>); return; }
    if (line.startsWith("## ")) { nodes.push(<h2 key={i}>{inline(line.slice(3))}</h2>); return; }
    if (line.startsWith("# ")) { nodes.push(<h1 key={i}>{inline(line.slice(2))}</h1>); return; }

    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      listType = "ul"; listItems.push(<li key={`li-${i}`}>{inline(line.trim().slice(2))}</li>); return;
    }
    if (/^\d+\.\s/.test(line.trim())) {
      listType = "ol"; listItems.push(<li key={`li-${i}`}>{inline(line.trim().replace(/^\d+\.\s/, ""))}</li>); return;
    }
    if (line.startsWith("> ")) { nodes.push(<blockquote key={i}>{inline(line.slice(2))}</blockquote>); return; }
    if (!line.trim()) { nodes.push(<div key={i} className="h-2" />); return; }
    nodes.push(<p key={i}>{inline(line)}</p>);
  });

  if (inCodeBlock && codeContent) nodes.push(<pre key="code-final"><code>{codeContent}</code></pre>);
  if (listType && listItems.length > 0) {
    if (listType === "ul") nodes.push(<ul key="list-final">{listItems}</ul>);
    else nodes.push(<ol key="list-final">{listItems}</ol>);
  }
  return nodes;
}

function inline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text; let key = 0;

  while (remaining) {
    let match = remaining.match(/\*\*([^*]+)\*\*/);
    if (match) {
      const idx = match.index!;
      if (idx > 0) nodes.push(remaining.slice(0, idx));
      nodes.push(<strong key={key++}>{match[1]}</strong>);
      remaining = remaining.slice(idx + match[0].length); continue;
    }
    match = remaining.match(/`([^`]+)`/);
    if (match) {
      const idx = match.index!;
      if (idx > 0) nodes.push(remaining.slice(0, idx));
      nodes.push(<code key={key++}>{match[1]}</code>);
      remaining = remaining.slice(idx + match[0].length); continue;
    }
    match = remaining.match(/\*([^*]+)\*/);
    if (match) {
      const idx = match.index!;
      if (idx > 0) nodes.push(remaining.slice(0, idx));
      nodes.push(<em key={key++}>{match[1]}</em>);
      remaining = remaining.slice(idx + match[0].length); continue;
    }
    match = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      const idx = match.index!;
      if (idx > 0) nodes.push(remaining.slice(0, idx));
      nodes.push(<a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer">{match[1]}</a>);
      remaining = remaining.slice(idx + match[0].length); continue;
    }
    nodes.push(remaining); break;
  }
  return nodes;
}
