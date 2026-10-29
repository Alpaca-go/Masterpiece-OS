import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createVisualWorkflow } from '../src/service.js';

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function withWorkflow(run: (workflow: any, root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'reference-atlas-'));
  try {
    await run(createVisualWorkflow({ root, emit: () => {} }), root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('reference atlas creates, lists and rejects invalid slugs', async () => {
  await withWorkflow(async (workflow) => {
    const created = await workflow.operations['visual-workflow:atlas-create']({}, {
      slug: 'warm-izakaya', title: '暖光居酒屋', styleScope: '市井烟火',
      brandCategory: '日式小馆', site: '街面 60㎡', likes: '暖光、木色、密度'
    });
    assert.equal(created.slug, 'warm-izakaya');
    const list = await workflow.operations['visual-workflow:atlas-list']({});
    assert.equal(list.length, 1);
    assert.equal(list[0].title, '暖光居酒屋');
    await assert.rejects(() => workflow.operations['visual-workflow:atlas-create']({}, { slug: 'Bad Slug' }));
  });
});

test('reference atlas uploads an image and serves it back', async () => {
  await withWorkflow(async (workflow) => {
    await workflow.operations['visual-workflow:atlas-create']({}, { slug: 'warm-izakaya', title: '暖光居酒屋' });
    const updated = await workflow.operations['visual-workflow:atlas-upload']({}, 'warm-izakaya', [
      { name: 'ref.png', mimeType: 'image/png', content: PNG }
    ]);
    assert.equal(updated.images.length, 1);
    const image = await workflow.operations['visual-workflow:atlas-image']({}, 'warm-izakaya', updated.images[0].id);
    assert.ok(image.dataUrl.startsWith('data:image/png;base64,'));
    const list = await workflow.operations['visual-workflow:atlas-list']({});
    assert.equal(list[0].imageCount, 1);
  });
});

test('reference atlas updates notes and exports notes with images', async () => {
  await withWorkflow(async (workflow, root) => {
    await workflow.operations['visual-workflow:atlas-create']({}, { slug: 'warm-izakaya', title: '暖光居酒屋' });
    await workflow.operations['visual-workflow:atlas-upload']({}, 'warm-izakaya', [
      { name: 'ref.png', mimeType: 'image/png', content: PNG }
    ]);
    const updated = await workflow.operations['visual-workflow:atlas-update']({}, 'warm-izakaya', { likes: '暖光', rejected: '太像居酒屋' });
    assert.equal(updated.likes, '暖光');
    const exported = await workflow.operations['visual-workflow:atlas-export']({}, 'warm-izakaya');
    assert.ok(exported.markdown.includes('暖光'));
    assert.ok(exported.markdown.includes('太像居酒屋'));
    assert.ok(exported.path.startsWith(path.join(root, 'reference-atlas', 'exports')));
    const notes = await fs.readFile(path.join(exported.path, 'notes.md'), 'utf8');
    assert.ok(notes.includes('# 暖光居酒屋'));
    const images = await fs.readdir(path.join(exported.path, 'images'));
    assert.equal(images.length, 1);
  });
});

test('reference atlas deletes an entry', async () => {
  await withWorkflow(async (workflow) => {
    await workflow.operations['visual-workflow:atlas-create']({}, { slug: 'warm-izakaya', title: '暖光居酒屋' });
    const result = await workflow.operations['visual-workflow:atlas-delete']({}, 'warm-izakaya');
    assert.equal(result.deleted, true);
    assert.equal((await workflow.operations['visual-workflow:atlas-list']({})).length, 0);
  });
});
