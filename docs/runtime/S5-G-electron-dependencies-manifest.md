# S5-G Electron Dependencies Manifest

## Removed dependency owners

Deleting `apps/desktop/package.json` removes the only current declarations of:

- `electron`
- `electron-vite`
- `electron-builder`
- Electron Builder packaging and signing graph

The Desktop workspace package itself is removed. No unrelated dependency
upgrade or broad unused-dependency cleanup is authorized by this batch.

## Lockfile rule

The root `package-lock.json` is regenerated with the repository's current npm
version using `npm install --package-lock-only --ignore-scripts`. Review must
show no `apps/desktop` workspace entry and `npm ls electron electron-vite
electron-builder --all` must report an empty graph.

