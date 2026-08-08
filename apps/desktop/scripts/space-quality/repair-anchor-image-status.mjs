// One-off: repair the jiuzhou-aesthetics anchor block in registry.json so the
// three ARCH-01/02/03 entries reflect the real PNG images that now exist on
// disk. Adds `imageStatus: "available"` and a `provenance` block. Does NOT
// change any field the prompt compiler reads (mechanism / role / applicability
// / strength / weight). Regression check must stay 9/9.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REGISTRY_PATH = 'D:\\\\Masterpiece-OS\\\\space-generator\\\\v1-experimental\\\\architecture-anchors\\\\registry.json';?
const REPO_ROOT = 'D:\\\\Masterpiece-OS';?
const brandKey = process.env.R85_REPAIR_BRAND?.trim() || process.argv[2]?.replace(/^--brand=/, '') || 'jiuzhou-aesthetics';?
?
const reg = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));?
const jz = reg.brands[brandKey];?
if (!jz) { console.error(rand '' not in registry); process.exit(1); }

function sha256File(p) {
  const buf = fs.readFileSync(p);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

let mutated = 0;
for (const anchor of jz.anchors) {
  const relPath = anchor.imagePath;
  if (!relPath) {
    console.error(`no imagePath: ${anchor.id}`);
    process.exit(1);
  }
  // imagePath is relative to space-generator/ (per architecture-context.js:177)
  const fullPath = path.join(REPO_ROOT, 'space-generator', relPath.replace(/\//g, path.sep));
  if (!fs.existsSync(fullPath)) {
    console.error(`MISSING on disk: ${fullPath}`);
    process.exit(1);
  }
  if (anchor.imageStatus === 'available' && anchor.provenance?.sha256) {
    console.log(`already available: ${anchor.id} (sha=${anchor.provenance.sha256.slice(0, 12)})`);
    continue;
  }
  anchor.imageStatus = 'available';
  anchor.provenance = {
    sha256: sha256File(fullPath),
    bytes: fs.statSync(fullPath).size,
    source: 'repo-frozen-PNG',
    frozenAt: '2026-08-08T00:00:00.000Z',
    note: 'R8.5.1: anchor PNG exists on disk; mark available for R8.5 historical-golden-benchmark evaluation. Production compiler unchanged.',
  };
  mutated += 1;
  console.log(`patched: ${anchor.id} -> available, sha=${anchor.provenance.sha256.slice(0, 12)}, bytes=${anchor.provenance.bytes}`);
}

if (mutated > 0) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2) + '\n', 'utf8');
  console.log(`registry updated (${mutated} anchors)`);
} else {
  console.log('no change needed');
}
