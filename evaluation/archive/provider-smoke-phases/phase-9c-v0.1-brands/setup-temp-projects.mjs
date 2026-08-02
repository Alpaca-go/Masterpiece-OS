#!/usr/bin/env node
// Create minimal temp desktop projects for brands that don't have one.
// Each project has:
//   project.json with brandKey + assets[] (1 reference image)
//   assets/<id>.png (copy of reference)
//
// 用途: 蛙耶 / 一剂良方 在 v0.1 reference folder 下有 VI 手册, 但没对应 desktop project.
// 冯烫烫 已有 desktop project (dca9b7d4), 不用新建.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const projectsRoot = 'C:/Users/Administrator/Documents/Masterpiece OS Data/projects';
const refRoot = 'D:/Masterpiece-OS/projects';

// brand: { folder, projectName, refSubdir }
const brands = [
  { key: 'yi-ji-liang-fang', folder: '一剂良方', refSubdir: '一剂良方原视觉方案' },
  { key: 'wa-ye', folder: '蛙耶', refSubdir: '蛙耶原视觉方案' },
];

function pickFirstImage(dir) {
  const files = readdirSync(dir).filter((f) => /\.(?:png|jpe?g|webp)$/iu.test(f));
  if (files.length === 0) throw new Error(`No images in ${dir}`);
  // Pick a mid-size one (avoid too-small UI icons and huge hero banners).
  // For YJLF / WAYE, the first few in numerical order tend to be logo or full layouts.
  // Pick the largest image as the reference (most likely a hero / reference shot).
  const sorted = files.map((f) => {
    const full = join(dir, f);
    return { f, size: statSync(full).size };
  }).sort((a, b) => b.size - a.size);
  return sorted[0].f;
}

for (const b of brands) {
  const refDir = join(refRoot, b.folder, b.refSubdir);
  if (!existsSync(refDir)) {
    console.log(`SKIP ${b.folder}: reference dir not found (${refDir})`);
    continue;
  }
  const pickedName = pickFirstImage(refDir);
  const pickedPath = join(refDir, pickedName);
  const ext = extname(pickedName).toLowerCase();
  const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';

  const projectId = randomUUID();
  const assetId = randomUUID();
  const projectDir = join(projectsRoot, `${b.folder}-${projectId}`);
  // image-generation service prepends "input/" to projectRelativePath, so the
  // actual file path is <projectDir>/input/assets/<id>.png (matching JZMX layout).
  const assetsDir = join(projectDir, 'input', 'assets');
  mkdirSync(assetsDir, { recursive: true });

  const assetFilename = `${assetId}${ext}`;
  const assetDest = join(assetsDir, assetFilename);
  copyFileSync(pickedPath, assetDest);

  const project = {
    id: projectId,
    name: `${b.folder} v0.1 reference`,
    brandKey: b.key,
    createdAt: new Date().toISOString(),
    assets: [{
      id: assetId,
      relativePath: `assets/${assetFilename}`,
      mimeType,
      status: 'ready',
      size: statSync(assetDest).size,
      originalFileName: pickedName,
      origin: 'v0.1 reference (manual copy)',
      createdAt: new Date().toISOString(),
    }],
  };
  writeFileSync(join(projectDir, 'project.json'), JSON.stringify(project, null, 2), 'utf8');

  console.log(`✓ ${b.folder} -> ${projectId}`);
  console.log(`  ref: ${pickedName} (${statSync(pickedPath).size}B)`);
  console.log(`  project: ${projectDir}`);
  console.log(`  asset:   input/assets/${assetFilename} (${statSync(assetDest).size}B)`);
  console.log('');
}
