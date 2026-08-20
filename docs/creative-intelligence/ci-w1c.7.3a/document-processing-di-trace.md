# CI-W1C.7.3A — Document Processing → DI Trace

> **Mode**: Zero-API diagnostic phase · **HEAD**: 5159d938
> **Purpose**: Audit the intended document pipeline path. For each real planning doc (if any), determine which step of the pipeline it reaches.

## Intended document pipeline

```
[user uploads planning doc]  (e.g., brief.pdf, brand-strategy.docx)
        ↓
document-processing
        ↓
document-context-service
        ↓
CI document-intelligence (DI)
        ↓
Evidence (evidence-ledger.json)
        ↓
Truth (project-truth.json)
        ↓
Need / Strategic Context / Prompt
        ↓
Synthesis
```

## Per-step classifier

For each step, classify the result:
- `FILE_NOT_REGISTERED` — file exists in project but not registered
- `PARSER_NOT_INVOKED` — file registered but parser not run
- `DOCUMENT_CONTEXT_NOT_CREATED` — file parsed but no document context
- `DI_NOT_INVOKED` — document context created but DI not run
- `DI_OUTPUT_NOT_PERSISTED` — DI run but output not persisted
- `DI_OUTPUT_NOT_CONTRIBUTED_TO_EVIDENCE` — DI output persisted but not in evidence
- `EVIDENCE_NOT_PROMOTED_TO_TRUTH` — evidence has entry but not in truth
- `REACHED` — step reached the next stage
- `N/A` — no source to trace (project has no planning doc)

## G01 九州美学 trace

| Step | Result | Evidence |
|---|---|---|
| Planning doc upload | N/A | `briefFiles: []` empty in project.json; 0 .docx/.pdf/.txt files |
| File registration | N/A | no source to register |
| Parser invocation | N/A | no source to parse |
| Document context creation | N/A | no source to context |
| DI invocation | REACHED (via PNGs, not via planning doc) | VUC was invoked via `input/assets/*.png` (28 PNGs). This is a different entry point: visual-asset-driven DI, not document-driven DI. |
| DI output persistence | REACHED | `project-context/visual-decision-packet.json` (v1) and `project-context/project-visual-context.vnext.json` (v2) both exist. |
| DI contribution to Evidence | **DI_OUTPUT_NOT_CONTRIBUTED_TO_EVIDENCE** | evidence-ledger.json has only 4 generic rows (`project:...:brand_name`, `project:...:industry`, `model:...:visual_understanding_core`, `model:chatcmpl-...:pso_provenance`). NO per-asset evidence rows. The 28 PNGs have IDs (357df67c-..., 4f65f3f8-..., etc.) but these IDs are NOT in evidence-ledger. |
| Evidence promotion to Truth | REACHED (partially) | `project:...:brand_name` and `project:...:industry` evidence rows correspond to brand.name and business.industry facts in truth. The 28 PNG asset evidence does NOT promote. |

**G01 finding**: The document-driven DI pipeline is **N/A** (no planning docs to trace). The visual-asset-driven DI pipeline is REACHED at Step 5 (DI output persisted) but **DI_OUTPUT_NOT_CONTRIBUTED_TO_EVIDENCE** at Step 6. The 28 PNGs become asset inventory in v1 DVC but not in evidence-ledger.

## G02 一剂良方 trace

| Step | Result | Evidence |
|---|---|---|
| Planning doc upload | N/A | same as G01 |
| File registration | N/A | no source to register |
| Parser invocation | N/A | no source to parse |
| Document context creation | N/A | no source to context |
| DI invocation | REACHED (via PNGs) | VUC invoked via 35 PNGs. |
| DI output persistence | REACHED | visual-decision-packet.json (v1) + project-visual-context.vnext.json (v2) both exist. |
| DI contribution to Evidence | **DI_OUTPUT_NOT_CONTRIBUTED_TO_EVIDENCE** | evidence-ledger.json has 4 generic rows, no per-asset rows. 35 PNG asset evidence missing. |
| Evidence promotion to Truth | REACHED (partially) | brand.name and business.industry promoted. Asset evidence not promoted. |

**G02 finding**: Same as G01. The visual-asset-driven DI pipeline reaches Step 5 (DI output persisted) but fails at Step 6 (DI output not contributed to evidence).

## Combined finding

| Step | G01 | G02 |
|---|---|---|
| Planning source present | NO | NO |
| Visual source present (PNGs) | YES (28) | YES (35) |
| DI invoked on visual source | YES | YES |
| DI output persisted | YES (v1 + v2 DVC) | YES (v1 + v2 DVC) |
| DI output contributed to Evidence | **NO** (only 4 generic rows) | **NO** (only 4 generic rows) |
| Evidence promoted to Truth | PARTIAL (brand.name + industry only) | PARTIAL (brand.name + industry only) |
| Truth → Need → Prompt | YES (3 projectFacts + 5 locked) | YES (3 projectFacts + 4 locked) |
| Synthesis reached | YES (PASS) | YES (PASS) |

**The hard gap is between DI output persistence and Evidence contribution.** The v1 DVC has 30+ asset entries with UUIDs, but the evidence-ledger.json has only 4 generic rows. The asset UUIDs in truth's `locked.assets` and the VUC's visual_understanding_core facts reach Truth via AUTHORITY rules, but they do NOT reach Evidence as first-class entries.

## Why this gap exists

The `evidence-ledger.json` schema (0.1) carries 4 entry types:
- `project_metadata` (project_record rows)
- `model_inference` (PSO + visual_understanding_core provenance rows)

There is no `asset_metadata` type. The 28-35 PNGs don't fit any existing type. The VUC's per-asset extraction (e.g., "assetId=4f65f3f8...=logo, confidence=0.95") lives in the `visual-decision-packet.json` `assetInventory` block but is not duplicated into evidence-ledger.

This is a **schema gap**, not a wiring bug. To fix it, the evidence-ledger schema would need a new entry type for per-asset evidence. This is out of CI-W1C.7.3A scope.

## Hard rule check (spec PART F)

> "If missing, classify exact link: FILE_NOT_REGISTERED, PARSER_NOT_INVOKED, ..."

For the planning-document path: ALL steps are N/A (no planning doc).

For the visual-asset path (which is what actually exists):
- DI invocation: REACHED
- DI output persistence: REACHED
- **DI_OUTPUT_NOT_CONTRIBUTED_TO_EVIDENCE**: REAL (evidence has no per-asset entries)
- EVIDENCE_NOT_PROMOTED_TO_TRUTH for asset-level: REAL (assets don't become truth facts, only locked.assets + brand.name + industry do)

## Conclusion

There is NO planning-document pipeline to trace (because no planning doc exists). The visual-asset pipeline reaches the DI output but fails to contribute to Evidence at the per-asset level. This is a separate finding from the planning-source-absence finding, but both are required to understand the full picture.
