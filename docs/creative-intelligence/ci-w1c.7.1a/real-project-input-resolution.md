# CI-W1C.7.1A — Real Project Artifact Resolution

> Date: 2026-08-20
> Phase: CI-W1C.7.1A
> Verdict prerequisite: real G01 / G02 artifact resolution PASS
> Harness: `apps/web-runtime/scripts/ci-w1c/real-project-prompt-qualification.mjs`
> Hard guards: `analysisProviderCallCount = 0`, `imageProviderCallCount = 0`

---

## 1. Resolved projects

| Alias | Project name | Project directory | projectId |
|---|---|---|---|
| G01 | 九州美学 | `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\九州美学-590eadf2` | `590eadf2-76cb-4042-a034-db93481b06c9` |
| G02 | 一剂良方 | `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\一剂良方-a13d6c09` | `a13d6c09-99f7-4ff9-b499-3b9f8a1df31b` |

These are the **real stored** Masterpiece-OS Creative Intelligence
artifacts. The harness does not substitute Alpha Studio / Bravo
School / generic fixtures.

---

## 2. Resolved artifact sources

For each project, the harness resolves three files from the
`project-context/creative-intelligence-shadow/` directory:

| Artifact | Path (relative to project root) | schemaVersion | Purpose |
|---|---|---|---|
| Project Truth | `project-context/creative-intelligence-shadow/project-truth.json` | `0.2` | Facts, assumptions, unknowns, conflicts, resolutions, warnings, provenance |
| Need skeleton | `project-context/creative-intelligence-shadow/need-intelligence.json` | (per file) | NeedItem[] with type / statement / factRefs / evidenceRefs / coverageRequirement |
| Evidence snapshot | `project-context/creative-intelligence-shadow/evidence-ledger.json` | `0.1` | EvidenceLedgerSnapshot with entries[] (project_metadata / document_section / etc.) |

---

## 3. Counts (resolved artifacts)

| Project | facts | needs | evidence entries | unique sourceIds | brand.name value |
|---|---:|---:|---:|---:|---|
| G01 九州美学 | 17 | 5 | 4 | 16 | `九州美学` |
| G02 一剂良方 | 16 | 5 | 4 | 15 | `一剂良方` |

These counts are produced by the harness after the real Project
Truth / Need / Evidence files are read; the values are NOT
fabricated.

---

## 4. Schema sanity

The harness asserts the following before proceeding to prompt
compilation:

| Check | G01 | G02 |
|---|---|---|
| `truth.projectId` matches the registered projectId | PASS | PASS |
| `truth.schemaVersion === '0.2'` | PASS | PASS |
| `evidence.schemaVersion === '0.1'` | PASS | PASS |
| `truth.facts` is a non-empty array | PASS (17) | PASS (16) |
| `needs.needs` is a non-empty array | PASS (5) | PASS (5) |
| `evidence.entries` is a non-empty array | PASS (4) | PASS (4) |

If any of the above fails, the harness aborts with
`FATAL: <reason>` and does NOT proceed to prompt qualification.

---

## 5. Source identity (no synthetic stand-in)

The harness rejects synthetic stand-in projects by:

1. **Registered projectId** — only `G01` and `G02` are valid
   aliases; the harness looks up the registered `expectedProjectId`
   and compares against the file's `projectId`. A mismatch aborts
   the qualification.
2. **Real directory** — the harness only reads from the user data
   root (`C:\Users\Administrator\Documents\Masterpiece OS Data\projects`).
3. **Real artifacts** — no in-memory fixtures; the harness reads
   from the real persisted files.

The previous CI-W1C.7.1 zero-network G01/G02 prompt dry-run used
synthetic stand-in fixtures (Alpha Studio / Bravo School). This
phase replaces those with the real stored artifacts.

---

## 6. Why the brand name string does NOT appear in the AUTHORITATIVE PROJECT FACTS section

The `compileStrategicReasoningContext` compiler filters
"authoritative planning" facts by:

```ts
function isAuthoritativePlanning(fact: ProjectTruthFact): boolean {
  return fact.authority === 'USER_CONFIRMED'
      || fact.authority === 'CONFIRMED'
      || fact.authority === 'LOCKED';
}
```

The real G01 / G02 `brand.name` facts carry authority
`AUTHORITATIVE_PROJECT_METADATA`, which is NOT in the
authoritative-planning list. As a result, the literal brand-name
string (`九州美学` / `一剂良方`) does not appear in the
`# AUTHORITATIVE PROJECT FACTS` section of the Strategic prompt.

This is **intentional** per the existing planning semantics. The
real project-specific content is still present via:

- `# LOCKED RULES` (G01 carries the literal `原始 Logo` /
  `简体中文` locked.facts content)
- `# NEED SKELETON` (real need statements referencing `brand.name`
  fact IDs)
- `# EVIDENCE` (real `ProjectRecord.brandName` evidence summaries)
- `# SOURCE TRACE IDS` (real project_record / visual_understanding_core
  source IDs)

The harness asserts these real project-specific content fragments
are present (`realProjectSpecificValuePresent`, `realNeedStatementPresent`,
`realEvidenceSummaryPresent`, `realSourceIdPresent`).

A future phase that wishes to include the brand-name string in the
AUTHORITATIVE PROJECT FACTS section may consider extending
`isAuthoritativePlanning` to include `AUTHORITATIVE_PROJECT_METADATA`
— but this is a planning-semantics change and is OUT OF SCOPE for
CI-W1C.7.1A.

---

## 7. Conclusion

- Real G01 / G02 artifact resolution PASS for both projects.
- The harness loads from the real persisted files, not synthetic
  stand-ins.
- All schema sanity checks pass.
- The prompts carry real project-specific content via the LOCKED
  / NEED / EVIDENCE / SOURCE TRACE IDS sections.

The next phase (PART B) can compile the real G01 / G02 prompts
with confidence that the input is the actual planning data.
