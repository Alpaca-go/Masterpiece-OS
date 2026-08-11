# S5-H Desktop Compatibility Paths Manifest

## Consumer-zero result

Repository-wide current-code search found zero consumers of the remaining
Desktop compatibility source paths. Of 87 tracked files, 86 are explicit
`COMPATIBILITY_ONLY` re-exports. The one non-re-export file,
`analysis-runtime-adapter.ts`, is a Desktop host adapter whose Node equivalent
is owned by `apps/web-runtime`.

## Removed

- all remaining tracked files under `apps/desktop/src/main/`
- `apps/desktop/src/shared/types.ts`

Current application contracts remain at
`@masterpiece/runtime-core/application-contracts.ts`; current application
services remain under `@masterpiece/runtime-core/application/*`.

Ignored local data and build artifacts under the historical path are not
tracked repository workspace content and are deliberately not deleted. This
batch does not touch user data, credentials, or historical `safeStorage`
payloads.

