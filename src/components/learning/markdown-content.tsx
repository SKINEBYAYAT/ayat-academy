import React from 'react';

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^)]+\))/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-link">{link[1]}</a>;
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export function MarkdownContent({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let bullets: string[] = [];
  let numbers: string[] = [];

  function flush() {
    if (bullets.length) {
      nodes.push(<ul key={'u' + nodes.length}>{bullets.map((item, i) => <li key={i}>{inline(item)}</li>)}</ul>);
      bullets = [];
    }
    if (numbers.length) {
      nodes.push(<ol key={'o' + nodes.length}>{numbers.map((item, i) => <li key={i}>{inline(item)}</li>)}</ol>);
      numbers = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith('- ')) { if (numbers.length) flush(); bullets.push(line.slice(2)); continue; }
    if (/^\d+\. /.test(line)) { if (bullets.length) flush(); numbers.push(line.replace(/^\d+\. /, '')); continue; }
    flush();
    if (!line.trim()) { nodes.push(<div className="markdown-spacer" key={'s' + nodes.length} />); continue; }
    if (line.startsWith('### ')) nodes.push(<h3 key={'h3' + nodes.length}>{inline(line.slice(4))}</h3>);
    else if (line.startsWith('## ')) nodes.push(<h2 key={'h2' + nodes.length}>{inline(line.slice(3))}</h2>);
    else if (line.startsWith('# ')) nodes.push(<h1 key={'h1' + nodes.length}>{inline(line.slice(2))}</h1>);
    else nodes.push(<p key={'p' + nodes.length}>{inline(line)}</p>);
  }
  flush();

  return <div className="lesson-markdown">{nodes}</div>;
}
