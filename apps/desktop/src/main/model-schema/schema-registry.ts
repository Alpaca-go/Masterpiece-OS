import { AssetAuthenticitySchema } from './asset-authenticity.schema.ts';
import { ProjectGraphicAnchorSchema, SystemAnchorSchema } from './anchors.schema.ts';
import { ProjectFactsSchema } from './project-facts.schema.ts';
import { ReferenceAssetSchema, ReferenceAssetsSchema } from './reference-assets.schema.ts';
import { StructurePolicySchema } from './structures.schema.ts';
import { StyleCarrierSchema } from './style-carriers.schema.ts';
import { TaskReferenceSelectionSchema } from './task-selection.schema.ts';

export const MODEL_SCHEMA_REGISTRY = {
  projectFacts: ProjectFactsSchema,
  referenceAsset: ReferenceAssetSchema,
  referenceAssets: ReferenceAssetsSchema,
  referenceMasterSet: ReferenceAssetsSchema,
  assetAuthenticity: AssetAuthenticitySchema,
  styleCarrier: StyleCarrierSchema,
  taskReferenceSelection: TaskReferenceSelectionSchema,
  structurePolicy: StructurePolicySchema,
  systemAnchor: SystemAnchorSchema,
  projectGraphicAnchor: ProjectGraphicAnchorSchema
} as const;

export type ModelSchemaRegistry = typeof MODEL_SCHEMA_REGISTRY;
