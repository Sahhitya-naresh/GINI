/**
 * Strips out tracking pixels and rewrites click-tracking links back to their original target URLs
 * before rendering email HTML inside the app (e.g., inside conversation threads).
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return '';

  // 1. Strip out any <img> tag whose src contains /api/track/open
  let sanitized = html.replace(
    /<img\b[^>]*?\bsrc\s*=\s*(["']?)[^"'>]*\/api\/track\/open[^"'>]*\1[^>]*\/?>/gi,
    ''
  );

  // 2. Rewrite any link that points to /api/track/click?url=... back to the original decoded URL
  sanitized = sanitized.replace(
    /<a\b([^>]*?)\bhref\s*=\s*(["'])([^"']*?\/api\/track\/click\?[^"']*?)\2([^>]*?)>/gi,
    (match, pre, quote, fullUrl, post) => {
      try {
        const queryIndex = fullUrl.indexOf('?');
        if (queryIndex !== -1) {
          const queryString = fullUrl.substring(queryIndex + 1);
          const params = new URLSearchParams(queryString);
          const targetUrl = params.get('url');
          if (targetUrl) {
            return `<a ${pre}href=${quote}${targetUrl}${quote}${post}>`;
          }
        }
      } catch (err) {
        console.warn('Could not rewrite tracking link:', err);
      }
      return match;
    }
  );

  return sanitized;
}
