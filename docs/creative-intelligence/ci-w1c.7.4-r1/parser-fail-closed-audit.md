# CI-W1C.7.4-R1 — Parser Fail-Closed Audit

> **Spec section:** PART H
> **Date:** 2026-08-20

## Goal

Close the parser-fallback safety gap: when `parseStrategyDocument` is
unavailable, the planning-brief file reader must NOT silently decode binary
content (`.pdf` / `.docx`) as UTF-8.

## Implementation

### Modified: `planning-source-registration.ts`

`readPlanningBriefFile` now distinguishes UTF-8-safe extensions from binary
extensions:

```ts
const UTF8_SAFE_EXTENSIONS = new Set(['.md', '.markdown', '.txt']);

// In readPlanningBriefFile:
if (documentProcessing && typeof documentProcessing.parseStrategyDocument === 'function') {
  const parsed = await documentProcessing.parseStrategyDocument(absolutePath);
  if (!parsed.rawText || !parsed.rawText.trim()) {
    throw new Error(`PLANNING-BRIEF-PARSE-FAILED: ${extension} produced empty text (${absolutePath})`);
  }
  return { rawText: parsed.rawText, extension, parseWarnings: parsed.parseWarnings };
}
// Parser unavailable. UTF-8 fallback for safe extensions only.
if (UTF8_SAFE_EXTENSIONS.has(extension)) {
  // ... raw UTF-8 read
  return { rawText, extension };
}
throw new Error(
  `PLANNING-PARSER-UNAVAILABLE: ${extension} requires runtime-core parseStrategyDocument (no UTF-8 fallback for binary formats)`
);
```

### Error codes (PART H suggested)

| Code | Trigger |
|---|---|
| `PLANNING-PARSER-UNAVAILABLE` | `parseStrategyDocument` is missing AND extension is `.pdf`/`.docx`. |
| `PLANNING-BRIEF-PARSE-FAILED` | Parser returned empty `rawText`. |
| `PLANNING-BRIEF-SOURCE-MISSING` | Source file does not exist (project-store layer). |
| `PLANNING-BRIEF-CONTENT-HASH-MISMATCH` | On-disk file content does not match the recorded hash. |
| `PLANNING-BRIEF-UNSUPPORTED-EXT` | Extension is not in the planning-brief set. |

### No OCR (PART H)

PDF files with no extractable text fail closed. No OCR fallback. The user
must provide a real text PDF.

## Tests

- `tests/packages/creative-intelligence/ci-7.4-r1/pfs-parser-safety.test.js`
  covers PFS-01..06.

```text
✔ PFS-01: txt UTF-8 fallback is allowed when parseStrategyDocument is unavailable
✔ PFS-02: md UTF-8 fallback is allowed when parseStrategyDocument is unavailable
✔ PFS-03: PDF extension is recognized as supported
✔ PFS-04: DOCX extension is recognized as supported
✔ PFS-05: a binary file with a planning-brief extension is NOT silently decoded as UTF-8 text
✔ PFS-06: when parseStrategyDocument returns empty rawText, the wrapper fails closed
```

6 / 6 PASS.

## Acceptance

✅ PDF/DOCX parser fallback is closed. Binary content is never silently
decoded as text. The wrapper fails closed with a stable error code.
