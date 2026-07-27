import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createGenerationSourceLoader, normalizeImageGenerationSources } from '../src/main/image-generation/context-loaders/index';
import { resolveProjectAssetPath } from '../src/main/image-generation/context-loaders/loader-utils';

test('legacy start input maps to integrated_anchor without rewriting upstream files', () => {
  const sources = normalizeImageGenerationSources({ projectId: 'p1', referenceAnchorRunId: 'ra1' });
  assert.equal(sources.preset, 'integrated_anchor');
  assert.equal(sources.purpose, 'production');
  assert.equal(sources.visual?.projectId, 'p1');
  assert.equal(sources.reference?.referenceAnchorRunId, 'ra1');
});

test('visual loader reads only visual project context and deterministically selects images', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-visual-loader-'));
  try {
    const projectRoot = path.join(root, 'projects', 'demo-p1');
    await fs.mkdir(path.join(projectRoot, 'outputs'), { recursive: true });
    await fs.mkdir(path.join(projectRoot, 'input', 'assets'), { recursive: true });
    await fs.writeFile(path.join(projectRoot, 'outputs', 'project-visual-context.json'), JSON.stringify({ schemaVersion: '1.0', projectId: 'p1' }));
    await fs.writeFile(path.join(projectRoot, 'input', 'assets', 'b.png'), 'b');
    await fs.writeFile(path.join(projectRoot, 'input', 'assets', 'a.png'), 'a');
    await fs.writeFile(path.join(projectRoot, 'project.json'), JSON.stringify({
      id: 'p1',
      assets: [
        { id: 'b', status: 'ready', mimeType: 'image/png', relativePath: 'assets/b.png' },
        { id: 'a', status: 'ready', mimeType: 'image/png', relativePath: 'assets/a.png' },
      ],
    }));
    const context = await createGenerationSourceLoader(root).load({
      preset: 'visual_extension',
      purpose: 'production',
      projectId: 'p1',
      visual: { projectId: 'p1' },
      userIntent: {},
    });
    assert.ok(context.visualContext);
    assert.equal(context.documentContext, undefined);
    assert.equal(context.referenceCapsule, undefined);
    assert.deepEqual(context.references.map((item) => item.assetId), ['a', 'b']);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('project asset paths are relative to input and legacy input-prefixed records remain readable', () => {
  const projectRoot = path.join('C:', 'data', 'projects', 'demo-p1');
  assert.equal(
    resolveProjectAssetPath(projectRoot, 'assets/a.png'),
    path.resolve(projectRoot, 'input', 'assets', 'a.png'),
  );
  assert.equal(
    resolveProjectAssetPath(projectRoot, 'input/assets/a.png'),
    path.resolve(projectRoot, 'input', 'assets', 'a.png'),
  );
  assert.throws(
    () => resolveProjectAssetPath(projectRoot, '../outside.png'),
    (error: Error & { code?: string }) => error.code === 'SOURCE_ASSET_PATH_INVALID',
  );
});

test('document loader does not require or create a visual project', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-document-loader-'));
  try {
    const output = path.join(root, 'document-runs', 'doc-1', 'outputs');
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, 'document-visual-context.json'), JSON.stringify({ schemaVersion: '1.0', sourceRunId: 'doc-1' }));
    const context = await createGenerationSourceLoader(root).load({
      preset: 'document_concept',
      purpose: 'exploration',
      document: { documentRunId: 'doc-1' },
      userIntent: {},
    });
    assert.ok(context.documentContext);
    assert.equal(context.visualContext, undefined);
    assert.equal(context.references.length, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('reference loader accepts awaiting_decision and does not read resolved context', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-reference-loader-'));
  try {
    const runRoot = path.join(root, 'reference-runs', 'ref-1');
    await fs.mkdir(path.join(runRoot, 'outputs'), { recursive: true });
    await fs.mkdir(path.join(runRoot, 'runtime'), { recursive: true });
    await fs.mkdir(path.join(runRoot, 'input', 'reference-assets'), { recursive: true });
    await fs.writeFile(path.join(runRoot, 'outputs', 'reference-style-capsule.json'), JSON.stringify({ schemaVersion: '1.0' }));
    await fs.writeFile(path.join(runRoot, 'outputs', 'Anchor-Generation-Brief.md'), '# Brief');
    await fs.writeFile(path.join(runRoot, 'runtime', 'run.json'), JSON.stringify({ status: 'awaiting_decision' }));
    await fs.writeFile(path.join(runRoot, 'input', 'reference-assets', 'style.png'), 'style');
    const context = await createGenerationSourceLoader(root).load({
      preset: 'reference_preview',
      purpose: 'exploration',
      reference: { referenceAnchorRunId: 'ref-1' },
      userIntent: {},
    });
    assert.equal(context.referenceDecision?.status, 'awaiting_decision');
    assert.equal(context.resolvedContext, undefined);
    assert.equal(context.references.length, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
