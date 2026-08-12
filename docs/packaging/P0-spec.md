# Masterpiece OS · Packaging Generator V1

**Source spec:** `Masterpiece OS · Packaging Generator V1 — Revised Development Specification.md` (2026-08-12)
**Status at copy:** `Visual Analysis A4 ✅` (commit `f94c51a`); Packaging V1 in P0 (Architecture & Reuse Audit)
**Document role:** Reference copy of the high-level spec for traceability. Detailed per-phase tasks come from the user's P0–P4 message (see `P0-final-report.md` for the resolved P0 task list).

## 1. Roadmap

```text
Visual Analysis A4 ✅
        ↓
Naming Freeze Gate
        ↓
Packaging P0  ←  we are here
Architecture & Reuse Audit
        ↓
Packaging P1
Golden Baseline & Contracts
        ↓
Packaging P2
Translation & Compiler
        ↓
Packaging P3
UI + Validation + Regression
        ↓
Packaging P4
Production Freeze
        ↓
Repository Stabilization
        ↓
Creative Intelligence
```

## 2. Core Engineering Discipline

> **Phase names describe history. Capability names describe software.**

`P0 / P1 / P2 / P3 / P4` may be used as project-management phase
labels (in this spec, in commit messages, in the workspace docs
directory). They are **forbidden** in production module names,
class names, constant names, and runtime namespaces.

### 2.1 Forbidden (production)

```text
p2-packaging-compiler
P3_PACKAGING_VERSION
packaging-vnext-runtime
packaging-p4          (as a package name)
```

### 2.2 Required (production)

```text
packaging-contract
packaging-translation
packaging-compiler
packaging-validator
packaging-generation-service
```

### 2.3 Versioning (when versions are required)

Use these **versioned field names** instead of phase / namespace
identifiers in payloads and contracts:

```text
schemaVersion
contractVersion
translationVersion
compilerVersion
validatorVersion
```

## 3. Final Target (per spec)

> **One stable core. Two production targets. Zero regression. No new version-name debt.**

The two production targets are:

- `space` (already shipping; Phase 9B-quality baseline; R9 productionization)
- `packaging` (V1; P0 → P1 → P2 → P3 → P4; this spec)

Packaging V1 must **reuse** the Shared Generation Core. It must
**not duplicate** the Space runtime. P0 freezes the boundary
between Shared / Space-only / Packaging-specific.
