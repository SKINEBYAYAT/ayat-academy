'use client';
import { useRef } from 'react';

export function RichTextEditor({ name, defaultValue = '' }: { name: string; defaultValue?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function wrap(before: string, after = before, placeholder = 'text') {
    const el = ref.current; if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const selected = el.value.slice(start, end) || placeholder;
    el.setRangeText(before + selected + after, start, end, 'end'); el.focus();
  }
  function line(prefix: string) {
    const el = ref.current; if (!el) return;
    const start = el.selectionStart;
    const lineStart = el.value.lastIndexOf('\n', start - 1) + 1;
    el.setRangeText(prefix, lineStart, lineStart, 'end'); el.focus();
  }
  return <div className="rich-editor">
    <div className="rich-toolbar" aria-label="Formatting">
      <button type="button" onClick={() => line('## ')}>Heading</button>
      <button type="button" onClick={() => wrap('**')}>Bold</button>
      <button type="button" onClick={() => wrap('*')}>Italic</button>
      <button type="button" onClick={() => line('- ')}>• List</button>
      <button type="button" onClick={() => line('1. ')}>1. List</button>
      <button type="button" onClick={() => wrap('[', '](https://)', 'link text')}>Link</button>
    </div>
    <textarea ref={ref} name={name} defaultValue={defaultValue} rows={12} maxLength={50000} />
    <small>Formatting is stored as safe Markdown text, not raw HTML.</small>
  </div>;
}
