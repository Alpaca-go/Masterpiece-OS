# Zero-Network Verification

The canonical command is:

```text
npm run verify:g01-frozen-baseline
```

The verifier reads only fixed repository-tracked paths: the R1.7 manifest/fingerprint/methodology and the three canonical R1.6 provenance files. It does not traverse parent directories, open the source DOCX or any PNG, inspect user-data directories, invoke a Provider, or use a network API.

## Canonicalization

The fingerprint uses `recursive-key-sort-json-v1`:

1. parse the manifest JSON;
2. recursively sort every object's keys in ascending JavaScript string order;
3. preserve array order;
4. serialize with `JSON.stringify` and no insignificant whitespace;
5. encode as UTF-8 without BOM;
6. compute SHA-256 and render lowercase hexadecimal.

The pretty-printed file bytes are not the hash input. This makes whitespace and object-key presentation irrelevant while keeping array order contract-sensitive.

## Mandatory checks

| Group | Result |
|---|---:|
| BASELINE-01..10 | 10/10 PASS |
| G02READY-01..06 | 6/6 PASS |

The verifier printed live calls 0, Attempt 6 executions 0, G02 executions 0, image calls 0, and external source reads 0.

## Continued offline regression

| Suite | Result |
|---|---:|
| R1 aggregate | 96/96 PASS |
| R2 | 34/34 PASS |
| R2.1 | 10/10 PASS |
| MOCK-01..08 | 8/8 PASS; the containing file's additional latency regression also passed (9/9 total) |
| Transport | 23/23 PASS |
| Strategic SR | 11/11 PASS |
| SG13/mirror | 8/8 PASS |
| QR | 5/5 PASS |
| SCOPE | 6/6 PASS |
| TRACE | 5/5 PASS; the containing file's two evidence/epistemic regressions also passed (13/13 total) |

The local package-manager fallback briefly attempted registry resolution while locating test runners. The sandbox rejected every request with `EACCES`, reported zero downloads, and the fallback was abandoned. All recorded verification commands then ran directly against the existing local Node modules. No Provider, model, image, G01 Attempt 6, G02, source-document, or external-source operation occurred.
