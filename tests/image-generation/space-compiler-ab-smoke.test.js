// Offline A/B parity runner test (Recovery R6).
//
// Verifies that run-ab-smoke.mjs compiles Mode B through the production
// compiler and that block sequence matches the documented Phase 9B Mode B
// order. The runner itself is offline by default; --dry-run=false requires
// explicit user credentials and is not exercised here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(
  REPO_ROOT,
  'scripts/image-generation/run-ab-smoke.mjs',
);

function writePacket(dir) {
  const file = path.join(dir, 'packet.json');
  const packet = {
    schemaVersion: '1.0',
    projectId: 'proj-ab-test',
    validation: { hardFactStatus: 'pass', executionDataStatus: 'ready' },
    projectFacts: {
      brandName: { value: 'Parity Brand' },
      industry: { value: 'medical_aesthetics' },
      brandRole: { value: 'science + warmth' },
    },
    creativeDecision: {
      uniqueUpgradeThesis: 'thesis',
      targetWorldview: ['calm'],
    },
    diagnosis: { brandMisreadRisks: [] },
    colorSystem: { forbidden: [] },
    materialSystem: [
      { material: 'matte plaster', behavior: ['warm white'], forbidden: [] },
    ],
    lightingSystem: {
      source: ['warm indirect'],
      interactionWithMaterials: ['soft falloff'],
      forbidden: [],
    },
    mediaTranslations: {
      spatial: {
        spatialConcept: 'layered translucent membrane',
        brandRoleManifestation: ['continuous ceiling carries the brand role'],
        signatureSpatialMechanism: ['translucent layering'],
        functionalNetwork: [
          'entrance to reception',
          'reception to waiting',
          'waiting to consult',
          'consult to treatment',
        ],
        sceneProgram: ['reception', 'waiting', 'consult', 'treatment'],
        mustBeVisible: ['reception desk'],
        structureLanguage: ['continuous curve'],
        positiveDifferentiators: ['membrane not acrylic'],
      },
    },
  };
  fs.writeFileSync(file, JSON.stringify(packet), 'utf8');
  return file;
}

test('run-ab-smoke produces a passing parity report for a ready packet', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ab-smoke-'));
  const packet = writePacket(dir);
  const out = path.join(dir, 'report.json');
  const result = spawnSync(process.execPath, [
    SCRIPT,
    `--project=proj-ab-test`,
    `--brand=jiuzhou-aesthetics`,
    `--packet=${packet}`,
    `--out=${out}`,
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(report.dryRun, true);
  assert.equal(report.modeB.compilerId, 'phase9b-quality-compiler');
  assert.equal(report.modeB.qualityGate, 'pass');
  assert.deepEqual(report.parity, []);
  assert.ok(report.modeB.anchorIds.includes('JZMX-ARCH-01-ReceptionMembrane'));
  assert.ok(report.modeB.promptChars > 2000);
});

test('run-ab-smoke exits non-zero when --brand is missing', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--project=x'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--brand/iu);
});
