export const VISUAL_MIGRATION_PRODUCT_SCHEMA = 'visual-migration-product/v1' as const;

export type VisualMigrationProductStatus =
  | 'reference_required' | 'reference_ready' | 'core_prepared' | 'task_required'
  | 'task_ready' | 'generating' | 'generation_failed' | 'audit_required'
  | 'audit_unavailable' | 'passed' | 'passed_with_warnings' | 'retry_available'
  | 'manual_review_required' | 'reference_conflict';

export type VisualMigrationProductTaskKind =
  | 'brand_hero' | 'vi_extension' | 'poster_signage'
  | 'packaging' | 'space_interior' | 'continuation';

export interface PrepareVisualMigrationTaskInput {
  projectId: string;
  creativeSessionId: string;
  taskKind: VisualMigrationProductTaskKind;
  userIntent: string;
  structureRequirement?: 'none' | 'preferred' | 'required';
  requiresCurrentProjectIdentity?: boolean;
}

export interface VisualMigrationProductStateV1 {
  schemaVersion: typeof VISUAL_MIGRATION_PRODUCT_SCHEMA;
  projectId: string;
  creativeSessionId?: string;
  status: VisualMigrationProductStatus;
  reference?: { referenceAnchorRunId: string; referencePackId?: string; referencePackFingerprint?: string };
  canon?: { canonId: string; canonFingerprint: string };
  task?: { taskId: string; taskKind: VisualMigrationProductTaskKind; policyId?: string; policyFingerprint?: string };
  generation?: { runId: string; status: string; imageIds: string[]; parentRunId?: string };
  audit?: {
    auditId: string;
    disposition: string;
    failureClasses: string[];
    warnings: string[];
    visibleFindings: Array<{ side: 'source' | 'reference'; category: string; observation: string }>;
    retryAvailable: boolean;
    correctionPlanId?: string;
    childRunId?: string;
  };
  updatedAt: string;
}

const FORBIDDEN_KEYS = /^(?:absolutePath|localPath|runtimeLocator|bytes|buffer|base64|dataUri|apiKey|authorization|token|cookie|providerRequest|providerResponse|reasoning|chainOfThought)$/iu;
const FORBIDDEN_BROWSER_INPUT_KEYS = /^(?:apiKey|authorization|token|secret|cookie|provider|providerRequest|providerResponse|canon|policy|candidateDeclarations|desiredReferenceRoles|requiredReferenceRoles|preferredReferenceCount|maxReferences|maxReferencesOverride|providerCapability)$/iu;

export function visualMigrationProductError(code: string, message: string, cause?: unknown): Error {
  return Object.assign(new Error(message, cause === undefined ? undefined : { cause }), { code });
}

export function assertVisualMigrationProductSafeDto(value: unknown, trail = '$'): void {
  if (typeof value === 'string') {
    if (/^[a-z]:[\\/]/iu.test(value) || /^\\\\/u.test(value) || /^file:\/\//iu.test(value)
      || /^data:/iu.test(value) || /(?:^|[\\/])\.\.(?:[\\/]|$)/u.test(value)) {
      throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_UNSAFE_RESPONSE', `${trail} contains unsafe data.`);
    }
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (value instanceof Uint8Array) {
    throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_UNSAFE_RESPONSE', `${trail} contains bytes.`);
  }
  if (Array.isArray(value)) return value.forEach((entry, index) => assertVisualMigrationProductSafeDto(entry, `${trail}[${index}]`));
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.test(key)) throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_UNSAFE_RESPONSE', `${trail}.${key} is forbidden.`);
    assertVisualMigrationProductSafeDto(entry, `${trail}.${key}`);
  }
}

export function assertVisualMigrationProductBrowserInput(value: unknown, trail = '$'): void {
  if (!value || typeof value !== 'object') return;
  if (value instanceof Uint8Array) {
    throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_FORBIDDEN_INPUT', `${trail} contains bytes.`);
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertVisualMigrationProductBrowserInput(entry, `${trail}[${index}]`));
    return;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_BROWSER_INPUT_KEYS.test(key)) {
      throw visualMigrationProductError('VISUAL_MIGRATION_PRODUCT_FORBIDDEN_INPUT', `${trail}.${key} is controlled by the application facade.`);
    }
    assertVisualMigrationProductBrowserInput(entry, `${trail}.${key}`);
  }
}

export function safeVisualMigrationProductDto<T extends VisualMigrationProductStateV1>(value: T): T {
  assertVisualMigrationProductSafeDto(value);
  return value;
}
