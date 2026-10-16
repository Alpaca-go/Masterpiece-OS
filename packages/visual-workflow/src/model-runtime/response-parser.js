function extractJsonCandidate(value) {
  const text = String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0) throw Object.assign(new Error("\u6A21\u578B\u8F93\u51FA\u4E2D\u672A\u627E\u5230 JSON \u5BF9\u8C61"), { code: "FAILED_SCHEMA" });
  return text.slice(start, end > start ? end + 1 : void 0).replace(/,\s*([}\]])/g, "$1").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}
function closeJsonContainersAtEof(text, maxClosers = 8) {
  const stack = [];
  let inString = false;
  let escape = false;
  for (const char of text) {
    if (inString) {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") stack.push("}");
    else if (char === "[") stack.push("]");
    else if (char === "}" || char === "]") {
      if (stack.pop() !== char) return text;
    }
  }
  if (inString || stack.length === 0 || stack.length > maxClosers) return text;
  const tail = text.trimEnd();
  if (!/(?:[}\]"\d]|true|false|null)$/u.test(tail)) return text;
  return `${tail}${stack.reverse().join("")}`;
}
function repairJsonSyntax(text) {
  let result = "";
  let inString = false;
  let escape = false;
  let lastSignificantChar = null;
  const isValueEnd = (c) => Boolean(c) && /[0-9a-z"\}\]]/i.test(c);
  const isValueStart = (c) => Boolean(c) && (/[0-9-]/u.test(c) || c === '"' || c === "{" || c === "[" || /[tfn]/iu.test(c));
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      result += char;
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === '"') {
        inString = false;
        lastSignificantChar = '"';
      }
      continue;
    }
    if (isValueStart(char)) {
      if (isValueEnd(lastSignificantChar)) result += ",";
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
function parseStructuredResponse(value) {
  const candidate = extractJsonCandidate(value);
  try {
    return JSON.parse(candidate);
  } catch (error) {
    const repaired = repairJsonSyntax(candidate);
    try {
      return JSON.parse(repaired);
    } catch {
      const closed = closeJsonContainersAtEof(repaired);
      try {
        return JSON.parse(closed);
      } catch {
        throw Object.assign(new Error(`\u7ED3\u6784\u5316 JSON \u89E3\u6790\u5931\u8D25\uFF1A${error.message}`), { code: "FAILED_SCHEMA", cause: error });
      }
    }
  }
}
export {
  parseStructuredResponse
};
