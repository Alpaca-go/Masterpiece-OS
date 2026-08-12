import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createAnalysisOperations,
  createContextIntegrationOperations,
  createCreativeProductionOperations,
  createCreativeSessionOperations,
  createDocumentOperations,
  createImageGenerationOperations,
  createProjectContextOperations,
  createProjectOperations,
  createReferenceOperations,
  createReportOperations,
  createSettingsOperations,
  createVisualMemoryOperations,
} from '@masterpiece/runtime-core';
import type { RuntimeServices } from '@masterpiece/runtime-core/application/runtime-services.ts';
import type { SaveApiProfileInput, SaveSettingsInput } from '@masterpiece/runtime-core/application-contracts.ts';

export interface NodeSettingsAdapter {
  get: () => unknown;
  save: (input: SaveSettingsInput) => unknown;
  saveProfile: (input: SaveApiProfileInput) => unknown;
  deleteProfile: (profileId: string) => unknown;
  setDefaultProfile: (profileId: string) => unknown;
  setProfileEnabled: (profileId: string, enabled: boolean) => unknown;
  testProfile: (input: SaveApiProfileInput) => unknown;
}

export function createCurrentBusinessOperations(services: RuntimeServices, settings: NodeSettingsAdapter) {
  const {
    projects, reports, pipeline, documentContext, projectContext, contextIntegration,
    referenceAnchor, imageGeneration, shortChainGeneration, creativeSessions,
    creativeDirections, styleProfiles, lockedAssets, visualMemory, anchorCandidates,
    visualCanons, referencePacks, creativeReading, creativeProductionBootstrap,
    quickStyleExtraction, creativeGeneration, anchorGeneration, visualExplorations,
    generationSeries, generationSeriesExecution, formalAssets,
  } = services;
  return Object.assign(
    {},
    createSettingsOperations(settings),
    createProjectOperations({ projects, pipeline }),
    createAnalysisOperations({ pipeline }),
    createReportOperations({ reports }),
    createProjectContextOperations({ projectContext }),
    createVisualMemoryOperations({ visualMemory, referencePacks }),
    createContextIntegrationOperations({ contextIntegration }),
    createDocumentOperations({ documentContext, readTextFile: (source: string) => fs.readFile(source, 'utf8') }),
    createReferenceOperations({ referenceAnchor }),
    createImageGenerationOperations({ service: imageGeneration, shortChainService: shortChainGeneration }),
    createCreativeSessionOperations({
      creativeSessions, creativeDirections, styleProfiles, visualCanons,
      imageGeneration, creativeReading, creativeGeneration,
    }),
    createCreativeProductionOperations({
      lockedAssets, creativeProductionBootstrap, quickStyleExtraction, styleProfiles,
      anchorGeneration, visualExplorations, anchorCandidates, visualCanons,
      generationSeries, generationSeriesExecution, formalAssets, imageGeneration,
      readTextFile: (source: string) => fs.readFile(source, 'utf8'),
      joinPath: path.join,
    }),
  );
}
