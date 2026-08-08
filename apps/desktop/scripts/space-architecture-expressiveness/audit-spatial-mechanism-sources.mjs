#!/usr/bin/env node
// audit-spatial-mechanism-sources.mjs
//
// R8.5.1 §4 — Generate mechanism-source-audit.json + mechanism-source-audit.md
// for a given V5 VisualDecisionPacket. Reads the audit logic from
// packages/image-generation-runtime/.../semantic and renders a human-readable
// provenance report.
//
// Usage:
//   node audit-spatial-mechanism-sources.mjs <packet.json> <out-dir>
//
//   packet.json: V5 VisualDecisionPacket (schemaVersion "1.0")
//   out-dir:     directory for mechanism-source-audit.{json,md}

import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGES_ROOT = resolve(__dirname, '..', '..', '..', '..', 'packages');
const SEMANTIC_PATH = pathToFileURL(
  resolve(PACKAGES_ROOT, 'image-generation-runtime', 'src', 'vnext', 'space-quality', 'semantic', 'index.js'),
).href;

function fail(msg) {
  process.stderr.write(`audit-spatial-mechanism-sources: ${msg}\n`);
  process.exit(1);
}

const [, , packetArg, outArg] = process.argv;
if (!packetArg || !outArg) fail('usage: audit-spatial-mechanism-sources.mjs <packet.json> <out-dir>');
const packetPath = resolve(packetArg);
const outDir = resolve(outArg);

const { auditMechanismSources, MECHANISM_PROVENANCE_VERSION } = await import(SEMANTIC_PATH);

let packet;
try {
  packet = JSON.parse(await fs.readFile(packetPath, 'utf8'));
} catch (e) {
  fail(`cannot read packet ${packetPath}: ${e.message}`);
}

const audit = auditMechanismSources(packet);

// Path can vary; the public summary is what we publish.
const out = {
  generatedAt: new Date().toISOString(),
  packetPath,
  packetSchemaVersion: packet.schemaVersion || 'unknown',
  summary: audit.summary,
  records: audit.records,
  provenanceVersion: MECHANISM_PROVENANCE_VERSION,
  risk: {
    colorGeometryCoupling: audit.summary.colorGeometryRisk > 0,
    motifInArchitectureIr: audit.records
      .filter((r) => r.includedInArchitecturePrompt && r.motifHits.length > 0)
      .map((r) => ({
        mechanismId: r.id,
        sourceField: r.sourceField,
        sourcePath: r.sourcePath,
        raw: r.sourceRawText,
        normalized: r.normalizedText,
        motifHits: r.motifHits,
        strip: r.strip,
      })),
  },
};

await fs.mkdir(outDir, { recursive: true });
const jsonPath = resolve(outDir, 'mechanism-source-audit.json');
const mdPath = resolve(outDir, 'mechanism-source-audit.md');

await fs.writeFile(jsonPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

// Build a human-readable MD report.
const lines = [];
lines.push('# Spatial Mechanism Source Audit (R8.5.1)');
lines.push('');
lines.push(`- Generated: ${out.generatedAt}`);
lines.push(`- Packet: \`${packetPath}\``);
lines.push(`- Schema: ${out.packetSchemaVersion}`);
lines.push(`- Provenance version: ${out.provenanceVersion}`);
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`- Total items audited: **${audit.summary.total}**`);
lines.push(`- Included in architecture prompt: **${audit.summary.includedInArchitecturePrompt}**`);
lines.push(`- Motif-bearing items: **${audit.summary.motifCount}**`);
lines.push(`- Color-geometry coupling risks: **${audit.summary.colorGeometryRisk}**`);
lines.push(`- Decorative-identity (logo/wordmark) items: **${audit.summary.decorativeIdentityCount}**`);
lines.push('');
lines.push('### By classification');
lines.push('');
for (const [k, v] of Object.entries(audit.summary.byClassification)) {
  lines.push(`- ${k}: ${v}`);
}
lines.push('');
lines.push('## Risk');
lines.push('');
if (out.risk.colorGeometryCoupling) {
  lines.push('- **COLOR_GEOMETRY_COUPLING_RISK**: at least one item couples a color term with a geometry action.');
} else {
  lines.push('- No color-geometry coupling detected.');
}
lines.push('');
if (out.risk.motifInArchitectureIr.length) {
  lines.push('- **Motif residue in Architecture IR** (informational; should be 0 after R8.5.1 fix):');
  for (const m of out.risk.motifInArchitectureIr) {
    lines.push(`  - \`${m.mechanismId}\` from \`${m.sourcePath}\` — raw=\`${m.raw}\` → normalized=\`${m.normalized}\``);
    if (m.strip.length) lines.push(`    strip: ${m.strip.join(' | ')}`);
  }
} else {
  lines.push('- No motif residue in Architecture IR (good).');
}
lines.push('');
lines.push('## Per-item record');
lines.push('');
for (const r of audit.records) {
  lines.push(`### ${r.id}  —  \`${r.classification}\``);
  lines.push('');
  lines.push(`- **Source Path**: \`${r.sourcePath}\``);
  lines.push(`- **Source Group**: \`${r.sourceGroup}\``);
  lines.push(`- **Raw**: ${r.sourceRawText}`);
  if (r.motifHits.length) lines.push(`- **Motif hits**: ${r.motifHits.join(', ')}`);
  if (r.colorHits.length) lines.push(`- **Color hits**: ${r.colorHits.join(', ')}`);
  lines.push(`- **archHits / propertyHits**: ${r.archHits} / ${r.propertyHits}`);
  lines.push(`- **metaphor / accent / geometryAction**: ${r.metaphor} / ${r.accent} / ${r.geometryAction}`);
  lines.push(`- **Normalized**: ${r.normalizedText || '(null — not included)'}`);
  if (r.strip.length) lines.push(`- **Strip**: ${r.strip.join(' | ')}`);
  lines.push(`- **Decision**: \`${r.includedInArchitecturePrompt ? 'INCLUDED in Architecture IR' : 'ROUTED to Brand / Lighting / Function'}\``);
  lines.push('');
}
lines.push('## Negatives (model-facing)');
lines.push('');
lines.push('After R8.5.1, the prompt adds a universal, brand-generic guard:');
lines.push('');
lines.push('> Do not convert brand symbols, brand mascots, graphic motifs, or any animal/feather/floral decoration into literal architectural structures (no motif-shaped focal wall, ceiling, or sculpture).');
lines.push('');

await fs.writeFile(mdPath, `${lines.join('\n')}\n`, 'utf8');

process.stdout.write(`wrote ${jsonPath}\nwrote ${mdPath}\n`);
