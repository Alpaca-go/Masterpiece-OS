# Packaging capability history

Packaging evolved through context selection, reference binding, provider
identity separation, upload hardening, and cross-project isolation. Current
behavior is documented by the semantic files in this directory and enforced by
runtime and image-generation tests.

Detailed phase-by-phase corrective reports were removed from the current tree
during repository version cleanup. They remain recoverable from Git history.

Current authority:

- Runtime workspace: `packages/runtime-core/src/application/packaging/`
- Generation contracts: `packages/image-generation-runtime/src/packaging/`
- Web workflow: `apps/web/src/features/packaging/`
- Operation wiring: `packages/runtime-core/src/operations/packaging-operations.js`
