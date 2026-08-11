# Masterpiece Agent Runtime Rules

## Runtime priority

Coding agents must treat Web as the Primary Runtime and Desktop as the Legacy Runtime.

When investigating or fixing a runtime defect, trace the user-visible Web path first:

```text
Browser renderer
→ Web API bridge
→ Web RPC
→ registered service
→ shared/core logic
→ provider adapter
```

A Desktop test or Electron-only smoke passing is not evidence that the Web path works.

## Required verification report

Every runtime change must report:

```text
Web tested: YES / NO
Desktop tested: YES / NO
Core tested: YES / NO
```

If Web was not tested, the change must not be described as accepted. State the blocker explicitly.

## Smoke classification

- `npm --prefix apps/desktop run smoke:web` is the Web structural smoke.
- Existing Electron service smokes are Legacy Compatibility Tests unless they actually enter through Web RPC.
- Direct compiler/provider scripts are Core or Provider tests and cannot be called Web acceptance.
- Mock/dry-run checks may prove structural reachability but must not be described as real-provider E2E.

## Repair boundary

Agents must not choose a Desktop-only fix merely because the relevant implementation currently lives under `apps/desktop`.

Before editing, establish:

1. the Web entry and RPC channel;
2. the service implementation reached by that channel;
3. whether the defect is transport, runtime adapter, shared core, or provider-specific;
4. which Web test demonstrates the failure and the repair.

## Behavior-sensitive code

The following are behavior-sensitive and must not be cleaned up, merged, moved, or rewritten without an explicit migration phase and Golden Regression evidence:

- prompts and prompt ordering;
- prompt compilers and negative constraints;
- Reference First and Continuation routing;
- anchor and Locked Asset behavior;
- analysis and generation schemas;
- model/provider routing;
- image preprocessing and response parsing;
- retry, fallback, and fail-closed gates.

## Repository safety

- Do not delete Desktop while Web depends on its main services.
- Do not infer ownership from directory names.
- Treat `UNKNOWN` as `KEEP`.
- Treat `LEGACY_CANDIDATE` as investigation status, not deletion authority.
- Record duplicate behavior-sensitive implementations; do not merge them during an audit.
- Preserve dirty working trees. Never reset, checkout, clean, or stash user changes without explicit authorization.
