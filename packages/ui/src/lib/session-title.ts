/**
 * Session title display utilities
 * Cleans up auto-generated titles that include system noise
 */

/** Noise phrases that appear in system-generated titles */
const NOISE_TITLE_PATTERNS = [
  /intuitive\s+session\s+title/gi,
  /session\s+naming/gi,
  /title\s+generation/gi,
  /prompts\s+only/gi,
  /context\s+and\s+command/gi,
]

/** Patterns to strip from session titles */
const TITLE_CLEANUP_PATTERNS = [
  // Brackets with content
  /\[SUPERMEMORY\]/gi,
  /\[CONTEXT\]/gi,
  /\[SYSTEM\]/gi,
  /\[AUTO\]/gi,
  /\[Image\s*#?\d*\]/gi,
  /\[Attachment\]/gi,
  /\[File\]/gi,
  
  // Command prefixes
  /^\/\w+\s+/g,
  
  // File paths
  /context\/[\w\-\/]+\.md/gi,
  /@[\w\-]+\.(md|json|yaml)/gi,
  
  // Agent prefixes
  /^(nomad|coder|task|planner|build|explorer|debug):\s*/gi,
  
  // Common noise phrases
  /^(help|please|can you|could you|i want to|i need to)\s+/gi,

  // System prompt noise
  ...NOISE_TITLE_PATTERNS,
  
  // Leading/trailing junk
  /^[\s\-:,]+|[\s\-:,]+$/g,
]

/** Words to skip when building short title */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'must', 'shall',
  'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
  'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'again', 'further', 'then', 'once',
  'here', 'there', 'when', 'where', 'why', 'how', 'all',
  'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'and', 'but', 'if', 'or', 'because', 'until', 'while',
  'this', 'that', 'these', 'those', 'it', 'its', 'im', 'i',
  'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he',
  'him', 'his', 'she', 'her', 'they', 'them', 'their', 'what',
])

/** Max display length */
const MAX_TITLE_LENGTH = 40

/**
 * Extract meaningful words from a string
 */
function extractKeyWords(text: string, maxWords = 4): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, maxWords)
}

/**
 * Clean up a raw session title for display
 */
export function cleanSessionTitle(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") {
    return "New chat"
  }

  let cleaned = raw.trim()

  // Apply cleanup patterns
  for (const pattern of TITLE_CLEANUP_PATTERNS) {
    cleaned = cleaned.replace(pattern, "")
  }

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim()

  const keywordSource = cleaned && cleaned.length >= 3 ? cleaned : raw

  // Extract key words and rebuild short title
  const words = extractKeyWords(keywordSource, 5)
  if (words.length === 0) {
    return "New chat"
  }

  // Capitalize first word
  const title = words.join(' ')
  const result = title.charAt(0).toUpperCase() + title.slice(1)

  // Truncate if needed
  if (result.length > MAX_TITLE_LENGTH) {
    return result.slice(0, MAX_TITLE_LENGTH - 3).trim() + "..."
  }

  return result
}

/**
 * Get a short slug for compact display
 */
export function getSessionTitleSlug(raw: string | undefined | null): string {
  const cleaned = cleanSessionTitle(raw)
  const words = cleaned.split(/\s+/).slice(0, 3)
  return words.length > 0 ? words.join(" ") : "Chat"
}
