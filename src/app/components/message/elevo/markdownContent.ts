import DOMPurify from 'dompurify';
import { marked } from 'marked';

export const markdownToCustomHtml = (body: string): string =>
  DOMPurify.sanitize(marked.parse(body, { gfm: true, breaks: true }) as string);

export const isElevoMarkdownContent = (content: Record<string, unknown>): boolean =>
  typeof content['vip.elevo.markdown'] === 'object' && content['vip.elevo.markdown'] !== null;
