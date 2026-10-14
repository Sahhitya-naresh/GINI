/**
 * src/utils/cleanReplyText.ts
 *
 * Strips quoted conversation history, header blocks, and mobile signatures
 * so only the newly typed reply text is evaluated or displayed.
 */

export interface CleanReplyResult {
  cleanedText: string;
  quotedHistory: string;
}

export function splitReplyAndQuotedHistory(text: string): CleanReplyResult {
  if (!text || typeof text !== 'string') {
    return { cleanedText: '', quotedHistory: '' };
  }

  const lines = text.split(/\r?\n/);
  const keptLines: string[] = [];
  const quotedLines: string[] = [];
  let reachedQuotedBoundary = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (reachedQuotedBoundary) {
      quotedLines.push(rawLine);
      continue;
    }

    // 1. Quoted lines with > or |
    if (trimmed.startsWith('>') || trimmed.startsWith('&gt;') || trimmed.startsWith('|')) {
      quotedLines.push(rawLine);
      continue;
    }

    // 2. Thread boundary markers (everything from here onwards is quoted history)
    if (
      /^on\s.+wrote:$/i.test(trimmed) ||
      /^on\s.+at\s.+wrote:$/i.test(trimmed) ||
      /^-----original message-----/i.test(trimmed) ||
      /^-----forwarded message-----/i.test(trimmed) ||
      /^________________________________/i.test(trimmed) ||
      /^from:\s*.+$/i.test(trimmed)
    ) {
      reachedQuotedBoundary = true;
      quotedLines.push(rawLine);
      continue;
    }

    // 3. Common mobile and email client signatures
    if (
      /^sent from my (iphone|ipad|android|galaxy|pixel|phone)/i.test(trimmed) ||
      /^sent with re\/max/i.test(trimmed) ||
      /^get outlook for (ios|android)/i.test(trimmed) ||
      trimmed === '--' ||
      trimmed === '-- '
    ) {
      reachedQuotedBoundary = true;
      quotedLines.push(rawLine);
      continue;
    }

    keptLines.push(rawLine);
  }

  let cleaned = keptLines.join('\n').trim();
  cleaned = cleaned.replace(/on\s+[\s\S]+?wrote:[\s\S]*$/i, '').trim();

  return {
    cleanedText: cleaned,
    quotedHistory: quotedLines.join('\n').trim()
  };
}

export function cleanReplyText(text: string): string {
  return splitReplyAndQuotedHistory(text).cleanedText;
}
