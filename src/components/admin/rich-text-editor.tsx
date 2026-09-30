'use client';
import { useRef } from 'react';

export function RichTextEditor({ name, defaultValue = '', language = 'en' }: { name: string; defaultValue?: string; language?: 'en'|'ar' }) {
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
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
    <div className="rich-toolbar" aria-label={t('Formatting','التنسيق')}>
      <button type="button" onClick={() => line('## ')}>{t('Heading','عنوان')}</button>
      <button type="button" onClick={() => wrap('**')}>{t('Bold','عريض')}</button>
      <button type="button" onClick={() => wrap('*')}>{t('Italic','مائل')}</button>
      <button type="button" onClick={() => line('- ')}>{t('• List','• قائمة')}</button>
      <button type="button" onClick={() => line('1. ')}>{t('1. List','1. قائمة')}</button>
      <button type="button" onClick={() => wrap('[', '](https://)', 'link text')}>{t('Link','رابط')}</button>
    </div>
    <textarea ref={ref} name={name} defaultValue={defaultValue} rows={12} maxLength={50000} />
    <small>{t('Formatting is stored as safe Markdown text, not raw HTML.','يتم حفظ التنسيق كنص Markdown آمن وليس كود HTML خام.')}</small>
  </div>;
}
