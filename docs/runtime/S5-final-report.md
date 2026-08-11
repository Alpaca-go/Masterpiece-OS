# S5 Final Report — Legacy Desktop Removal

Status: `PASS`

Readiness: `S6_READY`

Recovery tag: `pre-s5-desktop-removal-20260811`

## Outcome

| Metric | Result |
|---|---|
| Desktop runtime | REMOVED |
| Tracked Desktop workspace files | 226 -> 0 |
| Electron required by Current Runtime | NO |
| Exact Electron/electron-vite/electron-builder lock entries | 0 |
| Clean-install Electron packages on disk | 0 |
| Primary UI | Web Renderer (`apps/web`) |
| Primary host | Node Web Host (`apps/web-runtime`) |
| Business operation coverage | 136 |
| Node-native operation coverage | 11 |
| Total Web operation coverage | 147 |
| Current product features lost | 0 |
| User/credential data deleted | NO |

Across S5, 274 paths changed: 146 deleted and 16 added. File count is not the
acceptance criterion; every deleted production path had either a current
owner, a verified replacement, or a legacy-only classification.

## Removed

- Desktop-only tests and old test ownership (current behavior tests moved)
- Electron settings/`safeStorage` adapter
- preload/context bridge, IPC host and compatibility RPC adapter
- Electron Main lifecycle, windows, dialogs/shell binding and process boot
- Desktop build, packaging, smoke and local runner scripts
- Desktop workspace package and Electron dependency graph
- all Desktop compatibility re-exports and host adapters

The renderer batch deleted no tracked files because S4.1R had already moved
the UI to `apps/web` and the tracked Desktop renderer was empty.

## Preserved

- Prompt and report semantics
- compiler, reference and generator behavior
- provider request behavior and model registry
- schemas/contracts and checkpoint/persistence behavior
- Golden expectations and historical governance reports
- local user projects, outputs, settings and historical credential payloads

Ignored build/data remnants may still exist under an old local
`apps/desktop` path. They are not repository workspace content and were not
deleted under the user-data safety rule.

## Clean-install evidence

Detached worktree:
`.codex-smoke/s5-clean-install` at commit `bb06b04`.

- `npm ci`: PASS (114 packages installed)
- `npm ls electron electron-vite electron-builder --all`: empty graph
- `node_modules/electron`: absent
- `node_modules/electron-vite`: absent
- `node_modules/electron-builder`: absent
- Unit: 736/736
- CLI: 40/40
- Runtime: 14 contract + 334 application = 348/348
- Node Web Host: 14/14
- Actual Web / `web:smoke`: PASS
- process tree: Node Host present, Web present, Electron 0, Desktop Main 0
- Golden: G-01/G-02/G-03/G-04/G-05 PASS, provider calls 0, auto-update NO
- Web production build: PASS (47 modules transformed)
- `verify:current-flows`: PASS, offline
- version, naming, workspace, obsolete-code, production, project-rule and
  Golden-boundary gates: PASS

Clean verification initially exposed tests that read ignored Provider images
and a local known-case document. The tests now validate committed
run/evaluation/manifest/integrity evidence and the tracked prompt fixture
digest. No Provider output, credential or project artifact was committed, and
no test was skipped.

## Final topology

```text
Web Renderer
  -> Node Web Host
  -> Shared Operation Registry
  -> Shared Runtime
  -> Shared Core
  -> Provider adapters
```

See `S5-post-removal-topology.md`, `../core/CURRENT_ARCHITECTURE.md` and
`../core/RUNTIME_OWNERSHIP.md`.

## Final decision

All S5 readiness conditions are satisfied: Desktop Runtime is removed,
Electron Current Runtime dependency is 0, Actual Web/Runtime/CLI/Golden and
clean install pass, and Current Product Feature Lost is 0. The repository is
`S6_READY`.

