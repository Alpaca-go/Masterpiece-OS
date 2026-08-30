import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCreativeResearchDesignBriefService } from '@masterpiece/runtime-core/application/creative-research-design-brief-service.ts';
import { createCreativeResearchStore } from '@masterpiece/runtime-core/application/creative-research-store.ts';
import { atomicWriteJsonWithRetry } from '@masterpiece/runtime-core/application/runtime/atomic-write.ts';

const NOW = '2026-08-27T08:00:00.000Z';

function ids() {
  let next = 0;
  return () => `generated-${++next}`;
}

function dependencies(root: string, writeJson?: typeof atomicWriteJsonWithRetry) {
  const store = createCreativeResearchStore({ readDefaultDataPath: () => root, ...(writeJson ? { writeJson } : {}) });
  const documentAdapter = {
    async readEvidence(input: { projectId: string; sourceDocumentIds: string[] }) {
      return {
        ...input,
        documents: [{ documentId: input.sourceDocumentIds[0]!, filename: 'brief.md', sourceType: 'markdown' as const, role: 'creative-brief', parseWarnings: [] }],
        evidence: [{
          id: 'evidence-1', sourceDocumentId: input.sourceDocumentIds[0]!,
          locator: { kind: 'DOCUMENT_SECTION' as const, value: 'Audience' }, excerpt: 'Urban families', createdAt: NOW,
        }],
        warnings: ['Source documents disagree on channel priority'],
      };
    },
  };
  const analysisAdapter = {
    async draftDesignBrief() {
      return {
        projectSummary: 'Community hospitality brand', designTask: 'Create a flexible identity', audience: 'Urban families',
        scenarios: ['Store'], coreMessages: ['Open and trusted'], constraints: ['Keep the logo'],
        conceptKeywords: ['belonging'], visualKeywords: ['warm editorial'], evidenceIds: ['evidence-1'],
        fieldEvidence: {
          projectSummary: ['evidence-1'], designTask: ['evidence-1'], audience: ['evidence-1'],
          scenarios: ['evidence-1'], coreMessages: ['evidence-1'], constraints: ['evidence-1'],
        },
        searchKeywordSuggestions: [{ value: 'community table', kind: 'CONCEPT' as const }],
        warnings: ['Audience statement has medium confidence'],
      };
    },
  };
  return { store, documentAdapter, analysisAdapter };
}

test('R2 service persists session and monotonic Design Brief revisions while Session remains INTAKE', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-research-r2-store-'));
  try {
    const { store, documentAdapter, analysisAdapter } = dependencies(temporary);
    const service = createCreativeResearchDesignBriefService({
      sessions: store.sessions, briefs: store.briefs, documentAdapter, analysisAdapter,
      now: () => NOW, createId: ids(),
    });
    const session = await service.createSession({ projectId: 'project-1', sourceDocumentIds: ['document-1'] });
    const first = await service.prepareDesignBrief(session.id, { profileId: 'profile-1', designerNotes: ['Avoid collage'] });
    assert.equal((await service.getSession(session.id)).status, 'INTAKE');
    assert.equal(first.revision, 1);
    assert.equal(first.searchKeywords[0]?.source, 'AI');
    assert.match(first.warnings?.join('\n') || '', /channel priority/u);
    const second = await service.updateDesignBrief(session.id, {
      audience: 'Design-conscious urban families',
      searchKeywords: [{ ...first.searchKeywords[0]!, value: 'neighborhood gathering' }],
    });
    assert.equal(second.revision, 2);
    assert.equal(second.searchKeywords[0]?.source, 'DESIGNER');
    assert.equal(second.fieldEvidence?.audience, undefined);
    assert.match(second.warnings?.join('\n') || '', /Designer override: audience/u);
    assert.deepEqual((await service.listBriefRevisions(session.id)).map((brief) => brief.revision), [1, 2]);
    assert.equal((await service.getDesignBrief(session.id)).id, second.id);
    await assert.rejects(
      store.briefs.saveRevision(second),
      (error: any) => error.code === 'CREATIVE_RESEARCH_BRIEF_CONFLICT',
    );
    assert.equal((await service.listBriefRevisions(session.id))[1]?.id, second.id);
    const sessionFile = path.join(temporary, 'creative-research', session.id, 'runtime', 'session.json');
    const firstFile = path.join(temporary, 'creative-research', session.id, 'briefs', '0001.json');
    const secondFile = path.join(temporary, 'creative-research', session.id, 'briefs', '0002.json');
    await Promise.all([sessionFile, firstFile, secondFile].map((filename) => fs.access(filename)));
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('R2 store rejects duplicate revisions and reports write failure without false success', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-research-r2-write-failure-'));
  try {
    const failingWriter: typeof atomicWriteJsonWithRetry = async (filename, value, options) => {
      if (path.basename(filename) === '0001.json') {
        return { success: false, targetPath: filename, attempts: 1, errorCode: 'EACCES', errorMessage: 'denied' };
      }
      return atomicWriteJsonWithRetry(filename, value, options);
    };
    const { store, documentAdapter, analysisAdapter } = dependencies(temporary, failingWriter);
    const service = createCreativeResearchDesignBriefService({
      sessions: store.sessions, briefs: store.briefs, documentAdapter, analysisAdapter,
      now: () => NOW, createId: ids(),
    });
    const session = await service.createSession({ projectId: 'project-1', sourceDocumentIds: ['document-1'] });
    await assert.rejects(
      service.prepareDesignBrief(session.id, { profileId: 'profile-1' }),
      (error: any) => error.code === 'CREATIVE_RESEARCH_BRIEF_WRITE_FAILED',
    );
    assert.equal((await service.getSession(session.id)).activeDesignBriefId, undefined);
    assert.equal((await service.listBriefRevisions(session.id)).length, 0);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('Creative Research session deletion removes only the bounded session root', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'creative-research-delete-session-'));
  try {
    const { store } = dependencies(temporary);
    await store.sessions.create({
      id: 'session-delete', projectId: 'project-keep', status: 'INTAKE', sourceDocumentIds: ['document-1'],
      createdAt: NOW, updatedAt: NOW,
    });
    const sessionRoot = path.join(temporary, 'creative-research', 'session-delete');
    const projectSentinel = path.join(temporary, 'projects', 'project-keep', 'project.json');
    await fs.mkdir(path.join(sessionRoot, 'research', 'references'), { recursive: true });
    await fs.writeFile(path.join(sessionRoot, 'research', 'references', 'reference.json'), '{}', 'utf8');
    await fs.mkdir(path.dirname(projectSentinel), { recursive: true });
    await fs.writeFile(projectSentinel, '{}', 'utf8');

    assert.equal(await store.sessions.delete('session-delete'), true);
    assert.equal(await store.sessions.get('session-delete'), null);
    await assert.rejects(fs.access(sessionRoot));
    await fs.access(projectSentinel);
    assert.equal(await store.sessions.delete('session-delete'), false);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
