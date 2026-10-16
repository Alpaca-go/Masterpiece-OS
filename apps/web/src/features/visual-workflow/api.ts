export interface WorkflowProfile { id: string; name: string; modelId: string; modelType: string; provider: string; baseUrl: string; protocol: string; hasApiKey: boolean }
export interface WorkflowSettings { profiles: WorkflowProfile[]; analysisProfileId: string | null; imageProfileId: string | null }
export interface WorkflowAsset { id: string; originalName: string; role: string; mimeType: string }
export interface WorkflowProject { id: string; projectName: string; brandName: string; industry: string; description: string; status: string; assetCount: number; assets: WorkflowAsset[]; lastReportFilename?: string; visualContextVNextStatus?: string; lastError?: string }
export interface WorkflowRun { runId: string; status: string; errorMessage?: string; images: Array<{imageId: string}> }
export type WorkflowOptions = Record<string, { subtypes: string[]; shots: string[] }>;

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
