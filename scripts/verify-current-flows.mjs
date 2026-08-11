import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');

function run(label, executable, args) {
  process.stdout.write(`\n[current-flows] ${label}\n`);
  const result = spawnSync(executable, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('Engine document preparation paths', process.execPath, ['--test', 'apps/cli/tests/v5/document-preparation.test.js']);
run('Version naming policy', process.execPath, ['scripts/verify-version-naming.mjs']);
run('No project-specific production prompt rules', process.execPath, ['scripts/verify-no-project-specific-production-rules.mjs']);
run('Golden and fixture production boundary', process.execPath, ['scripts/verify-golden-production-boundary.mjs']);
run('Offline cross-project evaluation', process.execPath, ['scripts/run-golden-evaluation.mjs']);
run('Runtime document parsing and delivery paths', process.execPath, [npmCli, 'run', 'runtime-application:test']);
run('Node Web Host TypeScript contracts', process.execPath, [npmCli, 'run', 'web-runtime:typecheck']);
run('Web Renderer TypeScript contracts', process.execPath, [npmCli, 'run', 'web:typecheck']);

process.stdout.write('\n[current-flows] PASS — current-flows gate completed without external API calls.\n');
