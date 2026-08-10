function extractJsonCandidate(value) {
  const text = String(value || '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0) throw Object.assign(new Error('模型输出中未找到 JSON 对象'), { code: 'FAILED_SCHEMA' });
  return text.slice(start, end > start ? end + 1 : undefined)
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

// Complete only unambiguous EOF truncation: all strings must already be
// closed, every existing closer must match, the tail must contain a complete
// JSON value, and no more than a small number of containers may be missing.
// This repairs responses such as `...}]}` that merely omitted the outer `]}`
// without inventing keys, values, strings, commas, or semantic content.
function closeJsonContainersAtEof(text, maxClosers = 8) {
  const stack = [];
  let inString = false;
  let escape = false;
  for (const char of text) {
    if (inString) {
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') stack.push('}');
    else if (char === '[') stack.push(']');
    else if (char === '}' || char === ']') {
      if (stack.pop() !== char) return text;
    }
  }
  if (inString || stack.length === 0 || stack.length > maxClosers) return text;
  const tail = text.trimEnd();
  if (!/(?:[}\]"\d]|true|false|null)$/u.test(tail)) return text;
  return `${tail}${stack.reverse().join('')}`;
}

/**
 * Repair common JSON syntax errors produced by large-language-model outputs,
 * especially in very long JSON (~20 k tokens) where the model may forget
 * commas between array / object elements.
 *
 * Fixes applied (only outside of string literals): when a value is complete
 * (number, true/false/null, closing quote, `}` or `]`) and the next token
 * starts a new value (string, number, `-`, `{`, `[`, true/false/null), the
 * model almost certainly forgot the separating comma, so one is inserted.
 */
function repairJsonSyntax(text) {
  let result = '';
  let inString = false;
  let escape = false;
  let lastSignificantChar = null; // last non-whitespace char outside strings

  // A value may end with a digit, letter (true/false/null), quote or closer.
  const isValueEnd = (c) => Boolean(c) && /[0-9a-z"\}\]]/i.test(c);
  const isValueStart = (c) => Boolean(c)
    && (/[0-9-]/u.test(c) || c === '"' || c === '{' || c === '[' || /[tfn]/iu.test(c));

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      result += char;
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = false;
        lastSignificantChar = '"';
      }
      continue;
    }

    if (isValueStart(char)) {
      // A new value starts. If the previous significant character is the end
      // of a value (number, true/false/null, closing quote, `}` or `]`), the
      // model probably forgot a comma.
      if (isValueEnd(lastSignificantChar)) result += ',';
      result += char;
      lastSignificantChar = char;
      if (char === '"') inString = true;
      continue;
    }

    result += char;

    if (!/\s/.test(char)) {
      lastSignificantChar = char;
    }
  }

  return result;
}

export function parseStructuredResponse(value) {
  const candidate = extractJsonCandidate(value);
  try {
    return JSON.parse(candidate);
  } catch (error) {
    // Attempt to repair common LLM JSON syntax errors before giving up.
    const repaired = repairJsonSyntax(candidate);
    try {
      return JSON.parse(repaired);
    } catch {
      const closed = closeJsonContainersAtEof(repaired);
      try {
        return JSON.parse(closed);
      } catch {
        // Repair did not help — preserve the original error message.
        throw Object.assign(new Error(`结构化 JSON 解析失败：${error.message}`), { code: 'FAILED_SCHEMA', cause: error });
      }
    }
  }
}
