# CLI Version Map

## Entrypoints

| Entry | Resolution | Status | Evidence |
|---|---|---|---|
| `npm run analyze` | `apps/cli/bin/masterpiece-os.js analyze` | ACTIVE_RUNTIME (direct CLI) | root `package.json` |
| `npm run inventory` | same CLI binary | ACTIVE_RUNTIME (direct CLI) | root `package.json` |
| Desktop/Web analysis | dynamic import `apps/cli/src/v5/bootstrap.js` | ACTIVE_DEPENDENCY | `pipeline-service.ts:507` |
| CLI tests | `tests/*.test.js tests/v5/*.test.js` | TEST_DEPENDENCY | root and CLI packages |

## Internal chain

```text
bin/masterpiece-os.js
  -> runV5Pipeline
  -> src/v5/bootstrap.js
  -> src/v5/preparation/*
  -> src/v5/creative-director/*
  -> prompts/v5/*
  -> @masterpiece/model-runtime/qwen-reasoner.js
```

Only one executable CLI implementation was found. There are no CLI `v10`, `v11` or `vnext` entry directories. `v5` is an implementation namespace inside product `5.0.0-rc.1`, not an obsolete product binary.

## Dynamic/config dependencies

- `MASTERPIECE_PROVIDER` or `--provider` selects the direct CLI reasoner; current accepted implementation is `qwen`.
- `MASTERPIECE_PROMPT_ROOT` changes prompt filesystem resolution. Desktop sets it to development or packaged CLI prompt paths.
- Packaged Desktop therefore carries a filesystem dependency on `cli/prompts/v5` in addition to the source dynamic import used in development.

## Risk

`apps/cli/src/v5` and `apps/cli/prompts/v5` are `HIDDEN_VERSION_DEPENDENCY`, risk CRITICAL, status `ACTIVE_DEPENDENCY / DO NOT TOUCH`.
