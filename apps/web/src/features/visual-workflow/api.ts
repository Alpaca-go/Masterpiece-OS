export interface WorkflowProfile { id: string; name: string; modelId: string; modelType: string; provider: string; baseUrl: string; protocol: string; hasApiKey: boolean }
export interface WorkflowSettings { profiles: WorkflowProfile[]; analysisProfileId: string | null; imageProfileId: string | null }
export interface WorkflowAsset { id: string; originalName: string; role: string; mimeType: string }
export interface WorkflowProject { id: string; projectName: string; brandName: string; industry: string; description: string; status: string; assetCount: number; assets: WorkflowAsset[]; lastReportFilename?: string; visualContextVNextStatus?: string; lastError?: string }
export interface WorkflowRun { runId: string; status: string; errorMessage?: string; images: Array<{imageId: string}> }
export type WorkflowOptions = Record<string, { subtypes: string[]; shots: string[] }>;
export interface DesignColorEntry { name:string; paletteRole:string; role:string; surfaceApplicability:string; spatialUsage:string }
export interface DesignMaterialEntry { material:string; behavior:string; brandRole:string; forbidden:string }
export interface ProjectDesignDirectionFields extends Record<'spatialConcept' | 'structureLanguage' | 'materialLanguage' | 'lightingLanguage' | 'colorPolicy' | 'functionalProgram' | 'mustAvoid' | 'lightingContrast' | 'lightingInteraction' | 'lightingAvoid' | 'colorAvoid' | 'functionalNetwork' | 'functionalRelationships' | 'visibleRequirements' | 'artisticFocus' | 'compositionRequirements', string> {
  colorEntries:DesignColorEntry[];
  materialEntries:DesignMaterialEntry[];
}
export interface ProjectDesignDirection {
  projectId: string;
  status: 'missing' | 'draft' | 'confirmed' | 'needs_reconfirmation';
  reason: string | null;
  recordSha256: string | null;
  source: {statement: string} | null;
  fields: ProjectDesignDirectionFields;
  validationIssues:string[];
  confirmedAt: string | null;
}
export function createStandardGenerationInput(input: {
  projectId:string; family:string; subtype:string; shot:string; shotExplicit:boolean; ratio:string;
  instruction:string; include:string; avoid:string; hasLogo:boolean; directionRecordSha256:string | null;
}) {
  return {projectId:input.projectId,designDirectionExpectedRecordSha256:input.directionRecordSha256,
    task:{deliverableFamily:input.family,subtype:input.subtype,shot:input.shot,shotSource:input.shotExplicit?'user_explicit':undefined,
      aspectRatio:input.ratio,count:1,currentInstruction:input.instruction,generationBasis:'standard',referenceAssetIds:[],
      mustInclude:input.include.split('\n').filter(Boolean),mustAvoid:input.avoid.split('\n').filter(Boolean),logoUsageMode:input.hasLogo?'post_composite':'blank_area'}};
}

// This client has no access to the planning/migration API namespaces.
export async function workflowCall<T>(method: string, ...args: unknown[]): Promise<T> {
  const response = await fetch(`/_masterpiece/rpc/${encodeURIComponent(`visual-workflow:${method}`)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ args }),
  });
  const value = await response.json() as { result: T; error?: string };
  if (!response.ok) throw new Error(value.error || '视觉工作流请求失败');
  return value.result;
}
export function filePayload(file: File): Promise<{name: string; size: number; content: string}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, size: file.size, content: String(reader.result).split(',')[1] || '' });
    reader.onerror = () => reject(new Error(`无法读取 ${file.name}`));
    reader.readAsDataURL(file);
  });
}
