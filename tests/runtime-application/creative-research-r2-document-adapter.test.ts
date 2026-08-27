import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { createCreativeResearchDocumentAdapter } from '@masterpiece/runtime-core/application/creative-research-document-adapter.ts';

function makePdf(text: string): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${text.length + 34} >>\nstream\nBT /F1 12 Tf 72 720 Td (${text}) Tj ET\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let output = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(output, 'ascii')); output += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(output, 'ascii'); output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, 'ascii');
}

test('R2 document adapter reads PDF, DOCX, Markdown and text as traceable multi-document evidence', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-research-r2-docs-'));
  try {
    const sources = new Map<string, string>();
    const markdown = path.join(temporary, 'brief.md');
    const text = path.join(temporary, 'research.txt');
    const docx = path.join(temporary, 'guideline.docx');
    const pdf = path.join(temporary, 'strategy.pdf');
    await fs.writeFile(markdown, '# Brand\n\n## Audience\nUrban families');
    await fs.writeFile(text, 'Research shows that neighborhood trust matters.');
    const zip = new AdmZip();
    zip.addFile('word/document.xml', Buffer.from('<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Visual constraint</w:t></w:r></w:p><w:p><w:r><w:t>Keep the existing logo.</w:t></w:r></w:p></w:body></w:document>'));
    zip.writeZip(docx);
    await fs.writeFile(pdf, makePdf('Project objective and brand promise'));
    [markdown, text, docx, pdf].forEach((filename, index) => sources.set(`document-${index + 1}`, filename));
    const adapter = createCreativeResearchDocumentAdapter({
      resolveSource: async (id) => sources.get(id)!,
      now: () => '2026-08-27T08:00:00.000Z',
    });
    const material = await adapter.readEvidence({ projectId: 'project-1', sourceDocumentIds: [...sources.keys()] });
    assert.deepEqual(material.documents?.map((item) => item.sourceType).sort(), ['docx', 'markdown', 'pdf', 'text']);
    assert.ok(material.evidence.length >= 4);
    assert.deepEqual(new Set(material.evidence.map((item) => item.sourceDocumentId)), new Set(sources.keys()));
    assert.ok(material.evidence.every((item) => item.excerpt && item.locator.value));
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('R2 document adapter preserves same-section conflicts and fails closed for unsupported or empty input', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-research-r2-conflict-'));
  try {
    const first = path.join(temporary, 'first.md');
    const second = path.join(temporary, 'second.md');
    const unsupported = path.join(temporary, 'slides.pptx');
    const empty = path.join(temporary, 'empty.txt');
    await fs.writeFile(first, '# Plan\n\n## Audience\nFamilies');
    await fs.writeFile(second, '# Plan\n\n## Audience\nEnterprise buyers');
    await fs.writeFile(unsupported, 'not a presentation');
    await fs.writeFile(empty, '   ');
    const files = new Map([['a', first], ['b', second], ['ppt', unsupported], ['empty', empty]]);
    const adapter = createCreativeResearchDocumentAdapter({ resolveSource: async (id) => files.get(id)! });
    const material = await adapter.readEvidence({ projectId: 'project-1', sourceDocumentIds: ['a', 'b'] });
    assert.match(material.warnings?.join('\n') || '', /同名章节内容不一致/u);
    await assert.rejects(
      adapter.readEvidence({ projectId: 'project-1', sourceDocumentIds: ['ppt'] }),
      (error: any) => error.code === 'CREATIVE_RESEARCH_DOCUMENT_UNSUPPORTED',
    );
    await assert.rejects(
      adapter.readEvidence({ projectId: 'project-1', sourceDocumentIds: ['empty'] }),
      (error: any) => error.code === 'CREATIVE_RESEARCH_DOCUMENT_EMPTY',
    );
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
