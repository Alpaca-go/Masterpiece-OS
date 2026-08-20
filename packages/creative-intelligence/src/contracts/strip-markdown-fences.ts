/**
 * CI-W1C.7.2 — Strip markdown code fences from a model response.
 *
 * Chat-completions APIs (OpenAI / Qwen / dashscope OpenAI-compatible)
 * routinely return JSON wrapped in ` ```json ... ``` ` markdown
 * fences. The downstream parsers (parse-strategic-synthesis,
 * parse-model-assisted) used to call `JSON.parse(input.rawText)`
 * directly, which fails on the leading backtick of the fence.
 *
 * This helper strips the fence before the parser sees the text.
 * Pure function. No IO. Deterministic. Idempotent.
 *
 * The shape of the fence we accept:
 *
 *   ```json
 *   { ...json... }
 *   ```
 *
 *   or
 *
 *   ```
 *   { ...json... }
 *   ```
 *
 * or with leading/trailing whitespace, BOM, or stray prose.
 *
 * The helper:
 *   1. Trims the input.
 *   2. Strips a single leading ```lang (or bare ```) line and
 *      its trailing newline.
 *   3. Strips a single trailing ``` line and its leading newline.
 *   4. Returns the inner content, trimmed again.
 *
 * If the input does not look like a fenced block, it is returned
 * unchanged (so the downstream parser still sees the raw text and
 * can fail loudly if it is malformed JSON).
 *
 * The helper is intentionally minimal — it does not try to
 * recognize every markdown variation. It only handles the
 * conventions the chat-completions APIs actually emit, which
 * is enough to make the real production failure go away.
 */
export function stripMarkdownFences(rawText: string): string {
  if (typeof rawText !== 'string') return rawText;
  // BOM tolerance
  let text = rawText.replace(/^﻿/, '').trim();
  if (text.length === 0) return text;
  // Leading ```lang or ``` with optional whitespace before
  const leadingFence = /^```(?:[a-zA-Z0-9_+-]*)?\s*\r?\n?/;
  if (leadingFence.test(text)) {
    text = text.replace(leadingFence, '').trimStart();
  }
  // Trailing ``` (possibly with a leading newline)
  const trailingFence = /\r?\n?```\s*$/;
  if (trailingFence.test(text)) {
    text = text.replace(trailingFence, '').trimEnd();
  }
  return text;
}
