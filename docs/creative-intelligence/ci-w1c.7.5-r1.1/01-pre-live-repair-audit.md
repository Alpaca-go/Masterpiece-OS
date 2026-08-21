# CI-W1C.7.5-R1.1 Pre-Live Repair Audit

Date: 2026-08-21

Branch: `feat/short-chain-simplified-ui`

Upstream and local starting HEAD: `03db54a46b624566f93fbaa150814e172aa48af0`

## Starting state

- Local and `origin/feat/short-chain-simplified-ui` both resolved to the stated HEAD.
- No reset, rebase, amend, force push, or history rewrite was performed.
- The starting worktree was not clean. Two target runtime files already had local edits, and unrelated tracked/untracked local artifacts were preserved.
- Attempt-2-named artifacts were already present on disk at the start. R1.1 did not execute, read, replace, or certify those artifacts.

## Confirmed blockers

1. `document-context-to-planning-claims.ts` used CommonJS `require('node:crypto')` inside an ESM package.
2. The canonical `computeStructuredExtractionCoverage()` existed, but the orchestrator duplicated a reduced `claimCount >= 5 && semanticTypes >= 3` policy.
3. Narrative extraction failure was logged and the insufficient structured artifact continued to Strategic.
4. Narrative repair used an ad-hoc prompt that omitted the previous output.
5. Hybrid merge documentation promised confidence precedence while implementation kept the first content row.
6. Existing R1 tests did not execute the complete fake-reasoner narrative production path.
7. The live qualification script header incorrectly denied its pre-call planning-intake loader use.

## Scope boundaries retained

- No G01 Attempt 2 or G02 execution.
- No live model API or image generation.
- No UI, Concept, Direction, Anchor, or Visual Canon changes.
- Planning intake reads only the registered brief path; it does not enumerate the parent directory or siblings.
- No access to `D:\测试项目\九州美学\` or its legacy PNG files.
- Current narrative projection trace is a **section-level transitional trace**, not exact canonical chunk grounding.
- Current live qualification contract supports one narrative planning brief per qualification case; multi-document narrative extraction is not claimed.
