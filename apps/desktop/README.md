# Masterpiece OS Desktop

Electron + React + TypeScript desktop client for the Masterpiece OS v5 analysis pipeline.

The first-version analysis flow is intentionally minimal: choose or drop a ZIP, image set, PDF, or folder, review the automatically generated project name and detected clues, then click Start Analysis. Project name, brand, industry, Logo policy, and output language are not form fields. Original Logo assets are always locked and reports are always generated in Simplified Chinese.

## Commands

Run from the repository root:

```powershell
npm run desktop:dev
npm run desktop:test
npm run desktop:build
npm run desktop:package
```

The default Windows artifact is a no-install Portable EXE written to `apps/desktop/release/`. Double-click it to run the current build without changing the installed applications on the machine.

A runnable unpacked development build can also be created with:

```powershell
npm --prefix apps/desktop run package:dir
```

For the fastest edit-and-run loop, use `npm run desktop:dev`. Use `npm run desktop:package` only when a refreshed standalone EXE is needed.

If Electron or electron-builder assets are slow to download on a restricted network, install dependencies with the appropriate approved mirror configured in the shell. The repository does not store mirror credentials or model API keys.

## Security and data

- The renderer has no Node.js access. It communicates through the typed preload bridge and allow-listed IPC handlers.
- API keys are encrypted by Electron `safeStorage` and saved only under Electron's per-user data directory. Project metadata never contains a key.
- Imported ZIP paths and project file operations are checked against their expected root directories.
- Model requests are made only from the main process after an explicit user action.

## Pipeline boundary

The main process calls `runV5Pipeline` directly. It does not launch the CLI or assemble terminal commands. Desktop contributes project preparation, credentials, progress events, cancellation, and the Fusion Enhanced task profile; v5 remains the owner of visual preparation, reasoning, cache behavior, and official report generation.

The final report name follows:

```text
项目名称-视觉方案升级报告-模型名称.md
```

Invalid Windows filename characters are normalized before writing.
