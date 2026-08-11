import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import sharp from 'sharp';
import { createProjectStore } from '../src/main/project-store.ts';
import { resolveReferenceAsset } from '@masterpiece/image-generation-runtime/reference-engine/reference-asset-resolver.ts';
import type { PublicSettings } from '../src/shared/types.ts';

const ONE_PIXEL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

test('folder intake creates fixed metadata, imports assets, and detects Logo without credentials', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-desktop-intake-'));
  try {
    const source = path.join(temporary, '九州医美视觉方案');
    const data = path.join(temporary, 'data');
    await fs.mkdir(source, { recursive: true });
    await fs.writeFile(path.join(source, '九州美学-品牌Logo.png'), ONE_PIXEL_PNG);
    const settings: PublicSettings = {
      profiles: [{
        id: 'profile-test',
        displayName: 'Test Qwen',
        provider: 'qwen',
        baseUrl: 'https://example.invalid/compatible-mode/v1',
        modelId: 'qwen3-vl-plus',
        credentialKey: 'masterpiece-os/profile-test',
        hasApiKey: true,
        isDefault: true,
        isEnabled: true,
        createdAt: '2026-07-16T00:00:00.000Z',
        updatedAt: '2026-07-16T00:00:00.000Z'
      }],
      defaultProfileId: 'profile-test',
      provider: 'qwen',
      baseUrl: 'https://example.invalid/compatible-mode/v1',
      model: 'qwen3-vl-plus',
      hasApiKey: true,
      defaultDataPath: data,
      cacheEnabled: true,
      logLevel: 'info',
      connectionStatus: 'untested'
    };
    const store = createProjectStore(async () => settings);
    const project = await store.create({ sourcePaths: [source], apiProfileId: 'profile-test' });
    const summary = await store.scan(project.id);
    const paths = await store.paths(project.id);
    const stored = await fs.readFile(path.join(paths.root, 'project.json'), 'utf8');

    assert.equal(project.projectName, '九州医美');
    assert.equal(project.projectNameSource, 'uploaded-folder-name');
    assert.equal(project.logoLocked, true);
    assert.equal(project.outputLanguage, 'zh-CN');
    assert.equal(project.analysisProfile, 'fusion-enhanced');
    assert.equal(summary.imageCount, 1);
    assert.equal(summary.logoDetected, true);
    assert.match(project.detectedIndustry, /医学美学/);
    assert.doesNotMatch(stored, /apiKey|encryptedApiKey/i);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('ZIP intake persists only extracted valid assets, deduplicates by SHA-256, and supports deletion', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-desktop-zip-'));
  try {
    const data = path.join(temporary, 'data');
    const archive = path.join(temporary, 'input.zip');
    const zip = new AdmZip();
    zip.addFile('方案/九州美学-01.png', ONE_PIXEL_PNG);
    zip.addFile('方案/九州美学-copy.png', ONE_PIXEL_PNG);
    zip.addFile('方案/readme.txt', Buffer.from('ignored'));
    zip.writeZip(archive);
    const settings: PublicSettings = {
      profiles: [{
        id: 'profile-test',
        displayName: 'Test Qwen',
        provider: 'qwen',
        baseUrl: 'https://example.invalid/v1',
        modelId: 'qwen3-vl-plus',
        credentialKey: 'masterpiece-os/profile-test',
        hasApiKey: true,
        isDefault: true,
        isEnabled: true,
        createdAt: '2026-07-16T00:00:00.000Z',
        updatedAt: '2026-07-16T00:00:00.000Z'
      }],
      defaultProfileId: 'profile-test',
      provider: 'qwen',
      baseUrl: 'https://example.invalid/v1',
      model: 'qwen3-vl-plus',
      hasApiKey: true,
      defaultDataPath: data,
      cacheEnabled: true,
      logLevel: 'info',
      connectionStatus: 'untested'
    };
    const store = createProjectStore(async () => settings);
    const project = await store.create({ sourcePaths: [archive], apiProfileId: 'profile-test' });
    const summary = await store.scan(project.id);
    const paths = await store.paths(project.id);
    const inputFiles = await fs.readdir(paths.input, { recursive: true });

    assert.equal(summary.totalFiles, 1);
    assert.equal(summary.items[0]?.sourceType, 'archive-extracted');
    assert.equal(summary.items[0]?.archiveSourceName, 'input.zip');
    assert.ok(!inputFiles.some((filename) => String(filename).toLowerCase().endsWith('.zip')));
    assert.match(project.projectName, /^视觉项目-\d{8}-\d{6}$/);

    const cleared = await store.removeAsset(project.id, summary.items[0]!.id);
    assert.equal(cleared.totalFiles, 0);
    assert.equal((await store.get(project.id)).status, 'draft');

    await store.remove(project.id);
    assert.equal(await fs.stat(paths.root).then(() => true).catch(() => false), false);
    assert.equal((await store.list()).some((item) => item.id === project.id), false);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('re-importing an existing file is skipped and reported as a duplicate asset id', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-desktop-dup-'));
  try {
    const source = path.join(temporary, 'project-input');
    const data = path.join(temporary, 'data');
    await fs.mkdir(source, { recursive: true });
    await fs.writeFile(path.join(source, '素材-01.png'), ONE_PIXEL_PNG);
    const settings: PublicSettings = {
      profiles: [{
        id: 'profile-test',
        displayName: 'Test Qwen',
        provider: 'qwen',
        baseUrl: 'https://example.invalid/compatible-mode/v1',
        modelId: 'qwen3-vl-plus',
        credentialKey: 'masterpiece-os/profile-test',
        hasApiKey: true,
        isDefault: true,
        isEnabled: true,
        createdAt: '2026-07-16T00:00:00.000Z',
        updatedAt: '2026-07-16T00:00:00.000Z'
      }],
      defaultProfileId: 'profile-test',
      provider: 'qwen',
      baseUrl: 'https://example.invalid/compatible-mode/v1',
      model: 'qwen3-vl-plus',
      hasApiKey: true,
      defaultDataPath: data,
      cacheEnabled: true,
      logLevel: 'info',
      connectionStatus: 'untested'
    };
    const store = createProjectStore(async () => settings);
    const project = await store.create({ sourcePaths: [source], apiProfileId: 'profile-test' });
    const existing = (await store.scan(project.id)).items[0]!;

    const sameBytes = path.join(temporary, 'another-name.png');
    await fs.writeFile(sameBytes, ONE_PIXEL_PNG);
    const result = await store.importFiles(project.id, [sameBytes], 'assets');

    assert.equal(result.imported.length, 0);
    assert.ok(result.skipped.some((item) => /重复/.test(item)));
    assert.equal(result.duplicates.length, 1);
    assert.equal(result.duplicates[0]?.id, existing.id);
    assert.equal(result.summary.totalFiles, 1, 'no duplicate asset was added');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('generation reference import preserves completed analysis and stays outside analysis input', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-desktop-reference-'));
  try {
    const source = path.join(temporary, 'project-input');
    const data = path.join(temporary, 'data');
    await fs.mkdir(source, { recursive: true });
    await fs.writeFile(path.join(source, 'source.png'), ONE_PIXEL_PNG);
    const settings: PublicSettings = {
      profiles: [{
        id: 'profile-test',
        displayName: 'Test Qwen',
        provider: 'qwen',
        baseUrl: 'https://example.invalid/v1',
        modelId: 'qwen3-vl-plus',
        credentialKey: 'masterpiece-os/profile-test',
        hasApiKey: true,
        isDefault: true,
        isEnabled: true,
        createdAt: '2026-08-11T00:00:00.000Z',
        updatedAt: '2026-08-11T00:00:00.000Z'
      }],
      defaultProfileId: 'profile-test',
      provider: 'qwen',
      baseUrl: 'https://example.invalid/v1',
      model: 'qwen3-vl-plus',
      hasApiKey: false,
      defaultDataPath: data,
      cacheEnabled: true,
      logLevel: 'info',
      connectionStatus: 'untested'
    };
    const store = createProjectStore(async () => settings);
    const project = await store.create({ sourcePaths: [source], apiProfileId: 'profile-test' });
    const projectPaths = await store.paths(project.id);
    const reportFilename = 'completed-report.md';
    const reportPath = path.join(projectPaths.outputs, reportFilename);
    const preparedMarker = path.join(projectPaths.prepared, 'analysis-marker.json');
    await fs.writeFile(reportPath, '# completed');
    await fs.writeFile(preparedMarker, '{}');
    await store.update(project.id, {
      status: 'completed',
      lastReportFilename: reportFilename,
      visualContextStatus: 'ready',
      visualContextVNextStatus: 'ready'
    });

    const referencePath = path.join(temporary, 'reference.png');
    await sharp({
      create: { width: 2, height: 2, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } }
    }).png().toFile(referencePath);
    const imported = await store.importFiles(project.id, [referencePath], 'reference');
    const reference = imported.summary.items.find((item) => item.usage === 'generation_reference');
    const afterImport = await store.get(project.id);

    assert.ok(reference, 'generation reference is included in the reusable project asset library');
    assert.match(reference.relativePath, /^generation-references\//);
    assert.equal(await fs.stat(path.join(projectPaths.root, reference.relativePath)).then(() => true), true);
    assert.equal(await fs.stat(path.join(projectPaths.input, reference.relativePath)).then(() => true).catch(() => false), false);
    assert.equal(afterImport.status, 'completed');
    assert.equal(afterImport.lastReportFilename, reportFilename);
    assert.equal(afterImport.visualContextStatus, 'ready');
    assert.equal(afterImport.visualContextVNextStatus, 'ready');
    assert.equal(afterImport.assetCount, 1, 'generation references do not change analysis asset counts');
    assert.equal(await fs.readFile(reportPath, 'utf8'), '# completed');
    assert.equal(await fs.readFile(preparedMarker, 'utf8'), '{}');
    const resolution = await resolveReferenceAsset(
      reference.id,
      { projectRoot: projectPaths.root },
      afterImport.assets,
    );
    assert.equal(resolution.status, 'resolved');
    if (resolution.status === 'resolved') {
      assert.equal(resolution.record.absolutePath, path.join(projectPaths.root, reference.relativePath));
    }

    await store.removeAsset(project.id, reference.id);
    const afterRemoval = await store.get(project.id);
    assert.equal(afterRemoval.status, 'completed');
    assert.equal(afterRemoval.lastReportFilename, reportFilename);
    assert.equal(await fs.readFile(reportPath, 'utf8'), '# completed');
    assert.equal(await fs.readFile(preparedMarker, 'utf8'), '{}');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
