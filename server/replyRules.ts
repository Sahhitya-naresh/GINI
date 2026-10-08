/**
 * server/replyRules.ts
 * 
 * Centralized, editable phrase lists and rule-based classifier for inbound email replies.
 * All phrase lists live in this single file so they can be modified without altering logic.
 * Zero external AI/LLM dependencies — 100% deterministic and runs locally on the server.
 */

import { getDb, COLLECTIONS } from './mongodb.ts';

// --------------------------------------------------------------------------
// 1. PHRASE LISTS (Configurable)
// --------------------------------------------------------------------------

/**
 * Auto-replies, out-of-office notifications, bounces, and system notifications.
 * Must always be classified as neutral and flagged as automatic.
 * Never count as positive or negative.
 */
export const AUTO_REPLY_PHRASES: string[] = [
  'out of office',
  'out of the office',
  'automatic reply',
  'auto-reply',
  'auto reply',
  'autoreply',
  'automated response',
  'on vacation',
  'annual leave',
  'maternity leave',
  'paternity leave',
  'undeliverable',
  'delivery failure',
  'delivery status notification',
  'failure notice',
  'mailer-daemon',
  'mail delivery subsystem',
  'i am away',
  'currently away',
  'away from my desk',
  'away from the office',
  'no longer with the company',
  'no longer works at',
  'no longer work at',
  'has left the company',
  'mailbox is full',
  'undelivered mail',
  'system administrator',
  'this is an automated message'
];

/**
 * Deferral phrases indicating future interest or bad timing.
 * Always classified as neutral.
 */
export const DEFERRAL_PHRASES: string[] = [
  'not now',
  'maybe later',
  'next quarter',
  'circle back',
  'reach out in',
  'not at this time',
  'bad timing',
  'check back in',
  'follow up next',
  'ping me in',
  'touch base next quarter',
  'revisit this in',
  'revisit later',
  'busy right now',
  'swamped right now',
  'too busy at the moment',
  'touch base in',
  'reach out again in',
  'ping us in',
  'next year',
  'in a few months',
  'reach out next month'
];

/**
 * Strong negative phrases indicating opt-out, disinterest, or refusal.
 */
export const STRONG_NEGATIVE_PHRASES: string[] = [
  'unsubscribe',
  'remove me',
  'remove my email',
  'stop emailing',
  'stop sending',
  'do not contact',
  "don't contact",
  "don't email",
  'do not email',
  'take me off',
  'take us off',
  'opt out',
  'not interested',
  'no thanks',
  'no thank you',
  'no longer interested',
  'leave me alone',
  'please stop',
  'not a fit',
  'not relevant',
  'this is spam',
  'report spam',
  'reported as spam',
  'delete my info',
  'never contact',
  'cease and desist',
  'stop contacting',
  'wrong person',
  'not looking for'
];

/**
 * Strong positive phrases indicating interest, scheduling, or engagement.
 */
export const STRONG_POSITIVE_PHRASES: string[] = [
  'interested',
  "let's talk",
  "lets talk",
  "let's chat",
  "lets chat",
  "let's connect",
  "lets connect",
  'sounds good',
  'sounds great',
  'sounds interesting',
  'tell me more',
  'send me more info',
  'send more info',
  'send me more details',
  'send more details',
  'send me more pricing',
  'send pricing',
  'send over pricing',
  'schedule a call',
  'schedule a demo',
  'schedule a meeting',
  'book a call',
  'book a demo',
  'book a meeting',
  'book a time',
  'happy to chat',
  'happy to connect',
  'happy to talk',
  'would love to',
  'please call',
  'call me',
  'give me a call',
  'available on',
  'available this',
  'available next',
  'set up a call',
  'set up a time',
  'set up a meeting',
  'set up a demo',
  "let's do it",
  'free to chat',
  'free to talk',
  'send over a calendar',
  'send your calendar',
  'send your link',
  'yes'
];

// --------------------------------------------------------------------------
// 1.1 DEFAULT KEYWORDS & MONGODB ACTIVE KEYWORDS PERSISTENCE
// --------------------------------------------------------------------------

export interface ActiveKeywordLists {
  autoReplyPhrases: string[];
  deferralPhrases: string[];
  negativePhrases: string[];
  positivePhrases: string[];
}

export const DEFAULT_KEYWORD_LISTS: ActiveKeywordLists = {
  autoReplyPhrases: [...AUTO_REPLY_PHRASES],
  deferralPhrases: [...DEFERRAL_PHRASES],
  negativePhrases: [...STRONG_NEGATIVE_PHRASES],
  positivePhrases: [...STRONG_POSITIVE_PHRASES]
};

/**
 * Common short words that warrant a user warning if added alone (e.g. "no", "stop", "yes").
 */
export const COMMON_SHORT_WORDS = new Set([
  'no',
  'stop',
  'yes',
  'not',
  'ok',
  'okay',
  'thanks',
  'thank',
  'sure',
  'hi',
  'hello',
  'bye',
  'please',
  'help'
]);

export interface PhraseValidationResult {
  valid: boolean;
  normalized: string;
  warning?: string;
  error?: string;
}

/**
 * Validates, trims, lowercases, and collapses extra spaces in a phrase.
 * Rejects empty entries, out-of-range lengths (2-80), and case-insensitive duplicates.
 * Returns a warning if the phrase is a single very common word.
 */
export function validatePhrase(phrase: string, existingList: string[] = []): PhraseValidationResult {
  if (typeof phrase !== 'string') {
    return { valid: false, normalized: '', error: 'Phrase must be a string' };
  }
  const normalized = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) {
    return { valid: false, normalized: '', error: 'Phrase cannot be empty' };
  }
  if (normalized.length < 2 || normalized.length > 80) {
    return { valid: false, normalized, error: 'Phrase length must be between 2 and 80 characters' };
  }
  const isDuplicate = existingList.some(item => item.trim().toLowerCase().replace(/\s+/g, ' ') === normalized);
  if (isDuplicate) {
    return { valid: false, normalized, error: `Phrase "${normalized}" already exists in this list (case-insensitive duplicate)` };
  }

  let warning: string | undefined;
  const words = normalized.split(/\s+/);
  if (words.length === 1 && COMMON_SHORT_WORDS.has(normalized)) {
    warning = `"${normalized}" is a single very common word. It may match unintended replies (e.g. in casual phrasing). Are you sure you want to add it?`;
  }

  return { valid: true, normalized, warning };
}

// In-memory 60-second cache to avoid querying MongoDB on every inbound reply
let cachedKeywords: ActiveKeywordLists | null = null;
let cacheExpiryTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function clearKeywordCache(): void {
  cachedKeywords = null;
  cacheExpiryTime = 0;
}

/**
 * Retrieves the currently active reply keywords from MongoDB.
 * If not yet seeded in MongoDB, seeds with defaults first.
 * Uses an in-memory 60-second cache for high-throughput reply checks.
 */
export async function getActiveKeywords(forceRefresh = false): Promise<ActiveKeywordLists> {
  const now = Date.now();
  if (!forceRefresh && cachedKeywords && now < cacheExpiryTime) {
    return cachedKeywords;
  }

  try {
    const db = await getDb();
    const col = db.collection(COLLECTIONS.SETTINGS);
    let doc: any = await col.findOne({ id: 'reply_keywords' });

    if (!doc) {
      // Seed MongoDB from defaults the first time
      const seedDoc = {
        id: 'reply_keywords',
        autoReplyPhrases: [...DEFAULT_KEYWORD_LISTS.autoReplyPhrases],
        deferralPhrases: [...DEFAULT_KEYWORD_LISTS.deferralPhrases],
        negativePhrases: [...DEFAULT_KEYWORD_LISTS.negativePhrases],
        positivePhrases: [...DEFAULT_KEYWORD_LISTS.positivePhrases],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await col.updateOne({ id: 'reply_keywords' }, { $set: seedDoc }, { upsert: true });
      doc = seedDoc;
    }

    cachedKeywords = {
      autoReplyPhrases: Array.isArray(doc.autoReplyPhrases) ? doc.autoReplyPhrases : [...DEFAULT_KEYWORD_LISTS.autoReplyPhrases],
      deferralPhrases: Array.isArray(doc.deferralPhrases) ? doc.deferralPhrases : [...DEFAULT_KEYWORD_LISTS.deferralPhrases],
      negativePhrases: Array.isArray(doc.negativePhrases) ? doc.negativePhrases : [...DEFAULT_KEYWORD_LISTS.negativePhrases],
      positivePhrases: Array.isArray(doc.positivePhrases) ? doc.positivePhrases : [...DEFAULT_KEYWORD_LISTS.positivePhrases]
    };
    cacheExpiryTime = now + CACHE_TTL_MS;
    return cachedKeywords;
  } catch (err) {
    console.warn('Failed to load active keywords from MongoDB, using built-in defaults:', err);
    return {
      autoReplyPhrases: [...DEFAULT_KEYWORD_LISTS.autoReplyPhrases],
      deferralPhrases: [...DEFAULT_KEYWORD_LISTS.deferralPhrases],
      negativePhrases: [...DEFAULT_KEYWORD_LISTS.negativePhrases],
      positivePhrases: [...DEFAULT_KEYWORD_LISTS.positivePhrases]
    };
  }
}

/**
 * Persists updated active keywords to MongoDB and clears/refreshes the in-memory cache immediately.
 */
export async function saveActiveKeywords(lists: Partial<ActiveKeywordLists>): Promise<ActiveKeywordLists> {
  const current = await getActiveKeywords(true);
  const updated: ActiveKeywordLists = {
    autoReplyPhrases: lists.autoReplyPhrases || current.autoReplyPhrases,
    deferralPhrases: lists.deferralPhrases || current.deferralPhrases,
    negativePhrases: lists.negativePhrases || current.negativePhrases,
    positivePhrases: lists.positivePhrases || current.positivePhrases
  };

  const db = await getDb();
  const col = db.collection(COLLECTIONS.SETTINGS);
  await col.updateOne(
    { id: 'reply_keywords' },
    {
      $set: {
        id: 'reply_keywords',
        ...updated,
        updatedAt: new Date().toISOString()
      }
    },
    { upsert: true }
  );

  // Clear in-memory cache and populate updated
  cachedKeywords = { ...updated };
  cacheExpiryTime = Date.now() + CACHE_TTL_MS;
  return cachedKeywords;
}

/**
 * Resets a single category or all lists to built-in defaults in MongoDB.
 */
export async function resetKeywordsToDefault(category?: keyof ActiveKeywordLists | 'all'): Promise<ActiveKeywordLists> {
  const current = await getActiveKeywords(true);
  let updated: ActiveKeywordLists;

  if (!category || category === 'all') {
    updated = {
      autoReplyPhrases: [...DEFAULT_KEYWORD_LISTS.autoReplyPhrases],
      deferralPhrases: [...DEFAULT_KEYWORD_LISTS.deferralPhrases],
      negativePhrases: [...DEFAULT_KEYWORD_LISTS.negativePhrases],
      positivePhrases: [...DEFAULT_KEYWORD_LISTS.positivePhrases]
    };
  } else {
    updated = {
      ...current,
      [category]: [...DEFAULT_KEYWORD_LISTS[category]]
    };
  }

  return await saveActiveKeywords(updated);
}

/**
 * Free email providers ignored for company-domain fallback.
 */
export const FREE_EMAIL_PROVIDERS = new Set<string>([
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
  'aol.com',
  'live.com',
  'msn.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'yandex.com',
  'mail.com',
  'gmx.com'
]);

// --------------------------------------------------------------------------
// 2. TEXT NORMALIZATION & CLEANING
// --------------------------------------------------------------------------

/**
 * Strips quoted conversation history, header blocks, and mobile signatures
 * so only the newly typed reply text is evaluated.
 */
export function cleanReplyText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  const lines = text.split(/\r?\n/);
  const keptLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Quoted lines with > or |
    if (trimmed.startsWith('>') || trimmed.startsWith('&gt;') || trimmed.startsWith('|')) {
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
      break;
    }

    // 3. Common mobile and email client signatures
    if (
      /^sent from my (iphone|ipad|android|galaxy|pixel|phone)/i.test(trimmed) ||
      /^sent with re\/max/i.test(trimmed) ||
      /^get outlook for (ios|android)/i.test(trimmed) ||
      trimmed === '--' ||
      trimmed === '-- '
    ) {
      break;
    }

    keptLines.push(rawLine);
  }

  let cleaned = keptLines.join('\n').trim();

  // Strip trailing "On ... wrote:" if caught inline
  cleaned = cleaned.replace(/on\s+[\s\S]+?wrote:[\s\S]*$/i, '').trim();

  return cleaned;
}

// --------------------------------------------------------------------------
// 3. CLASSIFICATION INTERFACES & LOGIC
// --------------------------------------------------------------------------

export interface ReplyClassificationResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  matchedPhrases: string[];
  reason: string;
  isAutoReply?: boolean;
}

/**
 * Checks whether a matched phrase index in the text is preceded within 3 words
 * by a negation word (e.g. "not", "no", "never", "don't", "isn't").
 */
function isNegatedAtPosition(text: string, matchIndex: number): boolean {
  const precedingText = text.substring(0, matchIndex).trim();
  const words = precedingText.split(/\s+/).filter(Boolean);
  const precedingWords = words.slice(-3); // Look at last 1-3 words

  const negationRegex = /\b(not|never|no|hardly|scarcely|neither|nor)\b|n['’]t$/i;
  return precedingWords.some(w => negationRegex.test(w));
}

/**
 * Constructs a regular expression that matches a phrase as whole words/phrases,
 * preventing words like "no" from accidentally matching "know" or "notice".
 */
export function buildPhraseRegex(phrase: string): RegExp {
  const lower = phrase.trim().toLowerCase();
  const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startBoundary = /^\w/.test(lower) ? '\\b' : '(?:^|\\s|[^\\w])';
  const endBoundary = /\w$/.test(lower) ? '\\b' : '(?=$|\\s|[^\\w])';
  return new RegExp(`${startBoundary}${escaped}${endBoundary}`, 'gi');
}

/**
 * Searches for occurrences of phrases in text with boundary precision (whole words/phrases only).
 */
export function findMatchingPhrases(text: string, phraseList: string[]): { phrase: string; index: number }[] {
  const matches: { phrase: string; index: number }[] = [];
  const lowerText = text.toLowerCase();

  for (const phrase of phraseList) {
    if (!phrase || !phrase.trim()) continue;
    const regex = buildPhraseRegex(phrase);
    let m: RegExpExecArray | null;
    while ((m = regex.exec(lowerText)) !== null) {
      matches.push({ phrase, index: m.index });
    }
  }

  return matches;
}

/**
 * Classifies an inbound email reply text into positive, negative, or neutral.
 * Completely deterministic and rule-based.
 * Supports custom keyword overrides or uses cached MongoDB active lists.
 * 
 * Order of evaluation:
 *   a) Auto-replies first -> neutral (isAutoReply: true)
 *   b) Deferrals -> neutral
 *   c) Strong negatives vs strong positives (with negation guard)
 *   d) Decisions:
 *      - negative if negative phrases match and no positive survives negation guard
 *      - positive if at least one positive matches with no negative and no deferral
 *      - mixed, questions only, or no match -> neutral
 */
export function classifyReply(
  subject?: string, 
  body?: string, 
  keywordOverrides?: ActiveKeywordLists
): ReplyClassificationResult {
  const keywords = keywordOverrides || cachedKeywords || DEFAULT_KEYWORD_LISTS;
  const cleanSub = (subject || '').trim();
  const cleanBodyText = cleanReplyText(body || '');
  const combinedText = `${cleanSub}\n${cleanBodyText}`.toLowerCase();

  // ------------------------------------------------------------------------
  // A) AUTO-REPLIES (Check subject and body first using boundary matching)
  // ------------------------------------------------------------------------
  const autoMatches = findMatchingPhrases(combinedText, keywords.autoReplyPhrases);
  const matchedAutoPhrases = Array.from(new Set(autoMatches.map(m => m.phrase)));

  if (matchedAutoPhrases.length > 0) {
    return {
      sentiment: 'neutral',
      confidence: 1.0,
      matchedPhrases: matchedAutoPhrases,
      reason: `Auto-reply / system notice detected: ${matchedAutoPhrases.slice(0, 3).join(', ')}`,
      isAutoReply: true
    };
  }

  // If body is empty after stripping quotes/signatures
  if (!cleanBodyText && !cleanSub) {
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      matchedPhrases: [],
      reason: 'Empty reply content'
    };
  }

  // ------------------------------------------------------------------------
  // B) DEFERRAL PHRASES
  // ------------------------------------------------------------------------
  const deferralMatches = findMatchingPhrases(cleanBodyText, keywords.deferralPhrases);
  const matchedDeferrals = Array.from(new Set(deferralMatches.map(m => m.phrase)));

  // ------------------------------------------------------------------------
  // C) STRONG NEGATIVE PHRASES
  // Exception handling for tricky phrases:
  // "not interested in waiting" or "not interested in delaying" is NOT a rejection.
  // ------------------------------------------------------------------------
  const negativeMatches = findMatchingPhrases(cleanBodyText, keywords.negativePhrases);
  const validNegativePhrases: string[] = [];

  for (const match of negativeMatches) {
    if (match.phrase === 'not interested') {
      // Check if immediately followed by "in waiting" or "in delaying"
      const snippetAfter = cleanBodyText.substring(match.index + match.phrase.length, match.index + match.phrase.length + 20).toLowerCase();
      if (/^\s+in\s+(waiting|delaying|postponing|holding)/i.test(snippetAfter)) {
        continue; // Discard: this is expressing urgency, not rejection
      }
    }
    validNegativePhrases.push(match.phrase);
  }
  const matchedNegatives = Array.from(new Set(validNegativePhrases));

  // ------------------------------------------------------------------------
  // D) STRONG POSITIVE PHRASES (With Negation Guard)
  // ------------------------------------------------------------------------
  const positiveMatches = findMatchingPhrases(cleanBodyText, keywords.positivePhrases);
  const survivingPositives: string[] = [];

  for (const match of positiveMatches) {
    const isNegated = isNegatedAtPosition(cleanBodyText, match.index);
    if (!isNegated) {
      survivingPositives.push(match.phrase);
    }
  }
  const matchedPositives = Array.from(new Set(survivingPositives));

  // ------------------------------------------------------------------------
  // E) DECISION MATRIX
  // ------------------------------------------------------------------------

  // 1. Definite Negative: negative matched and no surviving positive
  if (matchedNegatives.length > 0 && matchedPositives.length === 0) {
    return {
      sentiment: 'negative',
      confidence: 0.95,
      matchedPhrases: matchedNegatives,
      reason: `Negative phrase(s) detected: ${matchedNegatives.join(', ')}`
    };
  }

  // 2. Definite Positive: positive matched, no negative, no deferral
  if (matchedPositives.length > 0 && matchedNegatives.length === 0 && matchedDeferrals.length === 0) {
    return {
      sentiment: 'positive',
      confidence: 0.95,
      matchedPhrases: matchedPositives,
      reason: `Positive phrase(s) detected: ${matchedPositives.join(', ')}`
    };
  }

  // 3. Deferral detected without positive
  if (matchedDeferrals.length > 0 && matchedPositives.length === 0) {
    return {
      sentiment: 'neutral',
      confidence: 0.85,
      matchedPhrases: matchedDeferrals,
      reason: `Deferral / timing phrase detected: ${matchedDeferrals.join(', ')}`
    };
  }

  // 4. Mixed Signals (both positive and negative/deferral) -> neutral
  if (matchedPositives.length > 0 && (matchedNegatives.length > 0 || matchedDeferrals.length > 0)) {
    const allMatches = [...matchedPositives, ...matchedNegatives, ...matchedDeferrals];
    return {
      sentiment: 'neutral',
      confidence: 0.6,
      matchedPhrases: allMatches,
      reason: `Mixed signals detected: positive (${matchedPositives.join(', ')}), negative/deferral (${[...matchedNegatives, ...matchedDeferrals].join(', ')})`
    };
  }

  // 5. Default / Question only / Unsure -> always neutral
  return {
    sentiment: 'neutral',
    confidence: 0.5,
    matchedPhrases: [],
    reason: 'No conclusive positive or negative sentiment phrases detected'
  };
}

// --------------------------------------------------------------------------
// 4. COMPANY NORMALIZATION & MATCHING HELPERS
// --------------------------------------------------------------------------

/**
 * Normalizes a company name for matching:
 * lowercase, trimmed, punctuation stripped, common corporate suffixes stripped.
 */
export function normalizeCompanyName(company?: string): string {
  if (!company) return '';
  let norm = company.toLowerCase().trim();

  // Strip punctuation
  norm = norm.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?]/g, ' ');

  // Strip corporate suffixes
  const suffixes = [
    'inc',
    'incorporated',
    'ltd',
    'limited',
    'llc',
    'pvt',
    'private',
    'corp',
    'corporation',
    'co',
    'company',
    'gmbh',
    'sa',
    'sarl',
    'bv',
    'pty'
  ];
  const regex = new RegExp(`\\b(${suffixes.join('|')})\\b`, 'gi');
  norm = norm.replace(regex, ' ');

  // Collapse whitespace
  norm = norm.replace(/\s+/g, ' ').trim();
  return norm;
}

/**
 * Extracts domain from email, ignoring free providers.
 */
export function extractCompanyDomain(email?: string): string {
  if (!email || !email.includes('@')) return '';
  const domain = email.split('@')[1].trim().toLowerCase();
  if (FREE_EMAIL_PROVIDERS.has(domain)) return '';
  return domain;
}

/**
 * Determines whether two leads belong to the same company
 * based on normalized company name or business email domain.
 */
export function areSameCompany(
  leadA: { company?: string; email?: string },
  leadB: { company?: string; email?: string }
): boolean {
  const normA = normalizeCompanyName(leadA.company);
  const normB = normalizeCompanyName(leadB.company);

  if (normA && normB && normA === normB) {
    return true;
  }

  const domA = extractCompanyDomain(leadA.email);
  const domB = extractCompanyDomain(leadB.email);

  if (domA && domB && domA === domB) {
    return true;
  }

  return false;
}
