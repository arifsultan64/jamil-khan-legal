import DOMPurify from 'dompurify';

export function generateSlug(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (cleaned.length >= 2) return cleaned.slice(0, 180);
  return `publication-${Date.now()}`;
}

export function generateSafeId(prefix = 'doc'): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'doc';
  const rand = Math.random().toString(36).slice(2, 8);
  return `${cleanPrefix}_${Date.now()}_${rand}`;
}

export function sanitizeHtml(dirtyHtml: string): string {
  return DOMPurify.sanitize(dirtyHtml || '', {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'u', 's',
      'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'table', 'thead',
      'tbody', 'tr', 'th', 'td', 'hr', 'sup', 'sub', 'code', 'pre', 'span', 'div',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'style', 'class', 'colspan', 'rowspan'],
  });
}

export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function estimateReadingTimeMinutes(htmlOrText: string): number {
  const plain = stripHtml(htmlOrText);
  const words = plain ? plain.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 220));
}

export function toMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof ts?.toMillis === 'function') return ts.toMillis();
  if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
  return 0;
}

export function formatDisplayDate(ts: any): string {
  const ms = toMillis(ts);
  if (!ms) return 'Unscheduled';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(ms));
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export function extractHeadingsAndInjectIds(html: string): { html: string; headings: TocHeading[] } {
  const headings: TocHeading[] = [];
  let idx = 0;
  const processed = (html || '').replace(/<h([1-3])([^>]*)>(.*?)<\/h\1>/gi, (_match, lvl, attrs, inner) => {
    const text = stripHtml(inner);
    if (!text) return _match;
    idx += 1;
    const id = `sec-${idx}-${generateSlug(text).slice(0, 40)}`;
    headings.push({ id, text, level: Number(lvl) });
    return `<h${lvl}${attrs} id="${id}">${inner}</h${lvl}>`;
  });
  return { html: processed, headings };
}
