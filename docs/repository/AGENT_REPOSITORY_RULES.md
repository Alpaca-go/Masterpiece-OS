# Agent Repository Rules

Read [REPOSITORY_CONTRACT.md](./REPOSITORY_CONTRACT.md) before changing Current Production code.

1. Modify the declared canonical Current Authority. Do not create a versioned, `latest`, `new`, `next`, `final`, backup, or copied implementation.
2. Use Git and historical documentation for history. Do not preserve history by duplicating a Current module.
3. Do not import `archive/`, historical runtime, labs, Desktop, or Electron from Current Production.
4. A legitimate API, schema, migration, protocol, external, fixture, historical, or compatibility version must be explicit. Register Current compatibility exceptions with a real consumer, owner, reason, and removal condition.
5. Do not change a frozen Prompt digest automatically. A Prompt change requires dedicated behavior evaluation, Golden verification, approval, and then an explicit digest update.
6. Do not update Golden fixtures or expected output merely to make a failure pass. Golden changes are a review event.
7. Do not make deterministic tests depend on ignored or machine-local generated artifacts.
8. Run `npm run repo:verify` before completion. For behavior-sensitive changes, also run `npm run repo:check` or the relevant full regression and Golden command.

The governance JSON files describe and protect the architecture; they are not runtime registries. Do not create a second operation or runtime source of truth.
