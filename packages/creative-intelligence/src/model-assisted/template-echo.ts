/**
 * CI-W1C.7 — Template Echo Detector.
 *
 * Spec §8: the deterministic Concept template bank is the comparison
 * corpus. We compute normalized token / n-gram similarity between
 * a candidate Concept's prose and the template bank.
 *
 * Thresholds (spec §8 "Template echo"):
 *   similarity >= 0.75 → BLOCK: TEMPLATE_ECHO_HIGH
 *   0.55–0.75          → WARNING
 *   <  0.55            → PASS
 *
 * Implementation notes:
 *   - Tokenization: lowercased CJK + ASCII word boundaries.
 *   - Stopword removal: a small English + CJK stopword list
 *     (project-agnostic).
 *   - Similarity: Jaccard over bigram (2-gram) sets. We do NOT use
 *     project-specific tokens; the corpus is the 8 deterministic
 *     Concept patterns from `generate-concepts.ts` plus the 8
 *     Direction family templates.
 *
 * The corpus is exposed via `getTemplateEchoCorpus()` so that
 * tests can verify the bank is project-agnostic and does not
 * contain any real-project tokens (per the no-project-specific-
 * production-rules gate).
 */

const STOPWORDS = new Set<string>([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'to', 'for', 'with', 'as', 'is', 'are', 'be',
  '我们', '你们', '他们', '这', '那', '的', '了', '在', '和', '与', '或', '为', '以', '是', '有',
  '一个', '一种', '在', '上', '下', '中',
]);

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  // split ASCII words + per-CJK-char
  const out: string[] = [];
  let buf = '';
  for (const ch of lower) {
    if (/[a-z0-9]/.test(ch)) {
      buf += ch;
    } else if (/[\u4e00-\u9fff]/.test(ch)) {
      if (buf.length > 0) {
        out.push(buf);
        buf = '';
      }
      out.push(ch);
    } else {
      if (buf.length > 0) {
        out.push(buf);
        buf = '';
      }
    }
  }
  if (buf.length > 0) out.push(buf);
  return out.filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

function bigrams(tokens: string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const a = tokens[i];
    const b = tokens[i + 1];
    if (a !== undefined && b !== undefined) out.add(`${a} ${b}`);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

const TEMPLATE_ECHO_CORPUS: ReadonlyArray<{ label: string; text: string }> = [
  {
    label: 'concept-pattern-identity-preservation',
    text: 'Identity preservation territory: reinforcing and protecting the confirmed brand identity through visual continuity and signature elements.',
  },
  {
    label: 'concept-pattern-differentiation',
    text: 'Differentiation territory: clarifying how the brand stands apart from category competitors via a distinctive strategic mechanism.',
  },
  {
    label: 'concept-pattern-business-model',
    text: 'Business model translation: making the operating model legible through visual hierarchy and structural choice.',
  },
  {
    label: 'concept-pattern-audience',
    text: 'Audience clarity territory: helping the primary audience recognise the brand\'s relevance within seconds.',
  },
  {
    label: 'concept-pattern-system-coverage',
    text: 'System coverage territory: building a coherent system that can extend across touchpoints without losing identity.',
  },
  {
    label: 'concept-pattern-evidence-led',
    text: 'Evidence-led territory: grounding each visible decision in a planning fact that the brand has already endorsed.',
  },
  {
    label: 'concept-pattern-future-orientation',
    text: 'Future orientation territory: making the brand read as a forward-looking choice without abandoning the present system.',
  },
  {
    label: 'concept-pattern-trust-transfer',
    text: 'Trust transfer territory: moving confidence from the brand\'s claimed expertise to a felt sense at the point of contact.',
  },
  {
    label: 'direction-family-structural-system',
    text: 'Structural system: information is organised by a clear grid that survives at every touchpoint and never becomes a layout gimmick.',
  },
  {
    label: 'direction-family-relational-network',
    text: 'Relational network: the system is organised by the relationships between elements rather than by their positions in a layout.',
  },
  {
    label: 'direction-family-narrative-sequence',
    text: 'Narrative sequence: the system unfolds in time; each touchpoint is one beat in a sequence the viewer can follow.',
  },
  {
    label: 'direction-family-editorial-system',
    text: 'Editorial system: typographic hierarchy and rhythm carry meaning; layout serves reading order rather than decoration.',
  },
  {
    label: 'direction-family-typographic-system',
    text: 'Typographic system: one family of type decisions expresses the brand\'s voice consistently across surfaces and scales.',
  },
  {
    label: 'direction-family-material-system',
    text: 'Material system: tactile and surface choices are the primary carrier of meaning, not a styling veneer.',
  },
  {
    label: 'direction-family-image-led',
    text: 'Image-led system: photography and image-making carry the conceptual weight; typography and graphics are restrained.',
  },
  {
    label: 'direction-family-spatial-system',
    text: 'Spatial system: the way the viewer moves through the work is the primary meaning-carrier; surfaces adapt to that movement.',
  },
];

/**
 * Exposed for tests so they can assert the corpus is
 * project-agnostic and free of forbidden project tokens.
 */
export function getTemplateEchoCorpus(): ReadonlyArray<{ label: string; text: string }> {
  return TEMPLATE_ECHO_CORPUS;
}

export interface TemplateEchoResult {
  similarity: number;
  topMatchLabel: string | null;
  band: 'pass' | 'warn' | 'block';
}

/**
 * Compute the maximum bigram Jaccard similarity between `text` and
 * any corpus entry. Returns the max similarity and the label of the
 * best-matching corpus entry.
 */
export function computeTemplateEcho(text: string): TemplateEchoResult {
  const tokens = tokenize(text);
  const grams = bigrams(tokens);
  let maxSim = 0;
  let topMatch: string | null = null;
  for (const entry of TEMPLATE_ECHO_CORPUS) {
    const corpusTokens = tokenize(entry.text);
    const corpusGrams = bigrams(corpusTokens);
    const sim = jaccard(grams, corpusGrams);
    if (sim > maxSim) {
      maxSim = sim;
      topMatch = entry.label;
    }
  }
  let band: TemplateEchoResult['band'];
  if (maxSim >= 0.75) band = 'block';
  else if (maxSim >= 0.55) band = 'warn';
  else band = 'pass';
  return {
    similarity: maxSim,
    topMatchLabel: topMatch,
    band,
  };
}
