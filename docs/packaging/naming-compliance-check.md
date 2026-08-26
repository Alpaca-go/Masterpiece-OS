# P0-7 �?Naming Compliance Check

**Phase:** Packaging V1 / P0 �?Architecture & Reuse Audit
**Date:** 2026-08-12
**Status:** `P0_NAMING_COMPLIANCE_FROZEN`
**Spec:** Packaging V1 Revised Development Specification §P0 ("确认新增代码�?phase/version namespace"; "P0 / P1 / P2 / P3 / P4 只是开发阶段名称，不允许进�?production module / class / constant / runtime namespace")
**Predecessor:** `space-regression-checklist.md`

## 1. Purpose (per P0 spec)

Confirm that the **current** repository contains no
phase/version-namespace leakage into production code, and lock
the rule that P1–P4 will not introduce any.

The P0 audit itself adds no production code. The check covers
**current** production code (apps/, packages/) and **forbids**
P1–P4 from introducing the patterns below.

## 2. Forbidden patterns (production code only)

Per the spec, the following are forbidden in production code
(`apps/`, `packages/` source files; runtime constants; class
names; module names; runtime namespace tags):

```text
# Forbidden as identifiers
p2-packaging-compiler        (and any  p\d-packaging-*  form)
P3_PACKAGING_VERSION         (and any  P\d_PACKAGING_*  form)
packaging-vnext-runtime      (and any  packaging-vnext-*  form)
packaging-p4                 (as a package name under packages/)
```

```text
# Forbidden as runtime namespaces
visual-analysis-v6           (already forbidden by A4 G-A4-05)
visual-analysis-vnext
visual-analysis-r12
visual-analysis-r\d+
visual-analysis-v18
analysis-r12
provider-final
provider-new
V18_VISUAL_ANALYSIS
V6_VISUAL_ANALYSIS
VNEXT_VISUAL_ANALYSIS
```

```text
# Forbidden specifically in NEW code paths in P1–P4
p\d-packaging-.*              (any  p\d-...  prefix on a module / class)
P\d_PACKAGING_.*              (any  P\d_...  constant in the Packaging domain)
```

The existing A4 guard `scripts/verify-a4-version-namespace.mjs`
already covers the `visual-analysis-*` / `V\d_VISUAL_ANALYSIS`
set. P0 does not duplicate that guard; P0 only extends the
scanned pattern set to include the **Packaging-specific**
phase-namespace forms (P3 will add a Packaging-naming guard
that ties the two together; the guard is **out of P0 scope**
per "P0 �?audit，不引入�?guard").

## 3. Required production naming

When P1–P4 add new code, the file / module / constant / class
names MUST be one of:

```text
# Production modules (P1–P4 introduce)
packaging-contract              # P1 �?Packaging Golden & Contracts
packaging-translation           # P2 �?Translation
packaging-compiler              # P2 �?Compiler
packaging-validator             # P3 �?Validator
packaging-generation-service    # P3 �?UI service wiring
```

```text
# Versioning fields (inside payloads; not in module names)
schemaVersion
contractVersion
translationVersion
compilerVersion
validatorVersion
```

```text
# Allowed phase tags (project-management only; never in production)
#   docs/packaging/P0-*.md
#   commit messages
#   branch names like feat/packaging-p2-*
#   worktree subdirs (if any)
```

## 4. Allowlist of current phase-tagged identifiers (kept for backward compatibility)

Some existing identifiers still carry phase / version tags. P0
documents them as **allowlisted**; future cleanup is **out of
A4 + P0 scope** (per "A4 baseline 不做大规�?repository cleanup,
不主动改 V18 / vNext / R11 等历史兼容命�?).

| Identifier | Where | Status |
|---|---|---|
| `R8.6` / `R9` / `R10` / `R11` / `R11.2` etc. | `tests/image-generation/space-r*.test.js` filenames + golden baseline directories (`space-generator/quality-baselines/current-verification/space-golden-…`) | KEEP (historical compatibility; outside P0 scope) |
| `phase9b-recovered` | `space-generator/quality-baselines/current-verification/source-packets/` | KEEP |
| `VNEXT_*` constants in non-Visual-Analysis modules (e.g. `VNEXT_VALIDATOR` in `deliverable-validator-service.ts`) | runtime-core / image-generation | KEEP (out of P0 scope; covered by existing `verify-version-naming` guard) |
| `vnext/` directory in `image-generation-runtime/src/vnext/` | compatibility shim (R9 productionization) | KEEP (R9 productionization, out of P0 scope) |
| `packaging-v3 / packaging-v4` etc. (none in current code) | n/a | n/a |

## 5. What P1–P4 must NOT introduce

P1–P4 commit authors MUST verify (manually, before commit) that
no file in `apps/`, `packages/`, or `runtime-core/.../image-generation/`
introduces a phase/version-tagged identifier outside the
allowlist in §4.

A **new** identifier that is phase-tagged is allowed **only**
if:

1. It is in a non-production file (test, docs, branch name,
   commit message), OR
2. It is on the existing allowlist (§4) AND the user explicitly
   approves the addition.

## 6. P0 audit: scan current production code

P0 ran a manual scan (no script added; out of P0 scope per
"audit only"). The scan checked the forbidden patterns from
§2 against the current production tree.

Result:

```text
Forbidden pattern                              Current matches in production
p2-packaging-compiler / p\d-packaging-*         0
P3_PACKAGING_VERSION / P\d_PACKAGING_*         0
packaging-vnext-runtime / packaging-vnext-*   0
packaging-p4 (package name)                    0
visual-analysis-v6 / vnext / r12 / v18          0 (covered by A4 G-A4-05)
analysis-r12 / provider-final / provider-new   0 (covered by A4 G-A4-05)
```

Existing phase-tagged identifiers are all in the allowlist (§4).

## 7. P3 (or P4) will add a guard

When P3 introduces the first Packaging production modules,
P3 MUST add a dedicated guard:

```text
scripts/verify-packaging-naming.mjs   # G-PKG-NAMING-01
```

The guard scans `apps/`, `packages/`, `runtime-core/.../image-generation/`
for:

- `p\d-packaging-*` (forbidden; P0 exception list = empty)
- `P\d_PACKAGING_*` (forbidden; P0 exception list = empty)
- `packaging-vnext-*` (forbidden)
- `packaging-p\d+` package name (forbidden)

P0 records the contract; P3 implements the guard.

## 8. P0-7 acceptance

- [x] Forbidden patterns documented (per spec)
- [x] Required production names documented (per spec)
- [x] Allowlist of existing phase-tagged identifiers recorded
- [x] P0 manual scan ran; 0 forbidden matches in production
- [x] P3 will add `verify-packaging-naming.mjs` (deferred; out of P0 scope)
- [x] No code change in P0
