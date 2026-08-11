# Masterpiece Runtime Policy

## Primary Runtime

Web is the primary runtime of Masterpiece OS.

All new features must be validated against Web.

All smoke tests intended to represent production behavior must execute through Web-compatible runtime paths.

The current Web runtime is started with:

```bash
npm run web:dev
```

The production-representative structural smoke is:

```bash
npm --prefix apps/desktop run smoke:web
```

## Legacy Runtime

Desktop is classified as Legacy Runtime.

Desktop may contain shared or historical business logic.

Desktop MUST NOT be deleted until Desktop Dependency Audit and Core Extraction are completed.

Legacy does not mean deprecated immediately or safe to delete.

## Acceptance

Desktop-only PASS does not constitute Masterpiece acceptance.

Web runtime failure means the feature is NOT accepted, even if Desktop passes.

The minimum acceptance evidence is:

```text
Core Smoke PASS
+
Web Smoke PASS
```

Desktop smoke tests may remain as Legacy Compatibility Tests.

## Shared Logic

New shared business logic must not be added to Desktop-only modules.

The present Web backend is hosted by `apps/desktop/src/main/index.ts`; this is a recorded transitional dependency, not the target ownership model. New reusable logic should be placed in `packages/*` when a behavior-preserving extraction phase explicitly authorizes it.

## Safety

Prompt / Compiler / Reference / Anchor / Generator logic is behavior-sensitive code and must not be refactored solely for code cleanliness.

Runtime location is not architectural ownership. Code under `apps/desktop` may be shared core, a runtime adapter, Desktop-only integration, or an unresolved legacy artifact.
