# Packaging Generator Version Map

## Active path

```text
ImageGenerationWorkspace (source bundle schema 3.0)
  -> image-generation/service.ts
  -> compileImageGenerationTask()
  -> compileImageGenerationTaskV3()
  -> deliverable policy/router
  -> compileDeliverablePrompt()
  -> deliverable gate + compile fingerprint
  -> configured provider adapter
```

| Version/branch | Purpose | Status | Evidence |
|---|---|---|---|
| Source bundle / task `3.0` | current standard deliverable contract | ACTIVE_RUNTIME | renderer initializes `schemaVersion: '3.0'` |
| Task `2.0` | prior source-bundle contract and migration source | ACTIVE_DEPENDENCY | `task-builder` and persisted-task service branches |
| Task/run `1.0` | legacy task/run compatibility | ACTIVE_DEPENDENCY / TEST_DEPENDENCY | service, schemas, fixtures, migration tests |
| `vnext` packaging contract | packaging route inside vNext prompt compiler | ACTIVE_DEPENDENCY | `compilePackagingPromptContract` |
| R9 packaging isolation | proves Space compiler does not capture packaging | TEST_DEPENDENCY | `space-r9-packaging-isolation.test.js` |

No separate Packaging Generator `R10`, `R11`, or `R12` implementation directory was found. R-numbered packaging references in evaluation reports are phase evidence, not source compiler versions.

## Risk conclusion

All three task schema generations remain executable or migratable. A higher task number is not permission to remove lower schemas. Packaging and Space share orchestration/provider infrastructure but intentionally use different compilers.
