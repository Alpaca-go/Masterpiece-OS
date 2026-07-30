import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function run(label, executable, args) {
  process.stdout.write(`\n[current-flows] ${label}\n`);
  const result = spawnSync(executable, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('Engine document preparation paths', process.execPath, ['--test', 'tests/v5/document-preparation.test.js']);
run('No project-specific production prompt rules', process.execPath, ['scripts/verify-no-project-specific-production-rules.mjs']);
run('Golden and fixture production boundary', process.execPath, ['scripts/verify-golden-production-boundary.mjs']);
run('Offline cross-project evaluation', process.execPath, ['scripts/run-golden-evaluation.mjs']);
run('Desktop document parsing and delivery paths', process.execPath, ['apps/desktop/node_modules/tsx/dist/cli.mjs', '--test', 'apps/desktop/tests/visual-translation-document-processing.test.ts', 'apps/desktop/tests/document-context-service.test.ts']);
run('Desktop TypeScript contracts', process.execPath, ['apps/desktop/node_modules/typescript/bin/tsc', '--noEmit', '-p', 'apps/desktop/tsconfig.json']);
process.stdout.write('\n[current-flows] PASS — current-flows gate completed without external API calls.\n');
