/**
 * src/utils/emailFormatters.ts
 *
 * Utilities to convert between raw HTML email markup and human-friendly plain text
 * for manual email composing and AI drafting.
 */

/**
 * Converts HTML body markup (with <p>, <br>, etc.) into natural, clean text
 * with paragraphs separated by newlines, stripping all raw HTML tags.
 */
export function htmlToPlainText(html: string): string {
  if (!html || typeof html !== 'string') return '';

  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts user-written natural plain text (with paragraphs and line breaks)
 * into standard, deliverable email HTML with <p> and <br/> tags.
 */
export function plainTextToEmailHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';

  const trimmed = text.trim();
  if (!trimmed) return '';

  // If the content is already full HTML markup (e.g. contains <p> or <div> blocks), return directly
  if (/^<[a-z][\s\S]*>$/i.test(trimmed) && (trimmed.includes('<p>') || trimmed.includes('<div') || trimmed.includes('<br'))) {
    return trimmed;
  }

  // Support basic markdown-style bold, italic, and links if the user entered them
  let formatted = trimmed
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');

  // Split into paragraphs by double newlines
  const paragraphs = formatted.split(/\n{2,}/);
  const htmlBlocks: string[] = [];

  for (const para of paragraphs) {
    const pTrim = para.trim();
    if (!pTrim) continue;

    const lines = pTrim.split('\n');
    let currentTextLines: string[] = [];
    let currentListItems: string[] = [];

    const flushText = () => {
      if (currentTextLines.length > 0) {
        const textContent = currentTextLines.join('<br/>');
        htmlBlocks.push(`<p style="margin: 0 0 14px 0; line-height: 1.6; color: #1e293b;">${textContent}</p>`);
        currentTextLines = [];
      }
    };

    const flushList = () => {
      if (currentListItems.length > 0) {
        const items = currentListItems.map(item => `<li>${item}</li>`).join('');
        htmlBlocks.push(`<ul style="margin: 0 0 16px 0; padding-left: 20px; line-height: 1.6;">${items}</ul>`);
        currentListItems = [];
      }
    };

    for (const line of lines) {
      const match = line.match(/^(\s*[-*•]|\s*\d+\.)\s+(.+)$/);
      if (match) {
        flushText();
        currentListItems.push(match[2].trim());
      } else {
        flushList();
        currentTextLines.push(line);
      }
    }

    flushText();
    flushList();
  }

  return htmlBlocks.join('\n');
}
