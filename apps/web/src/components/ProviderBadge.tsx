// A3-I Visual Analysis Provider Badge
//
// Per A3 spec §27 / §28 / §29 / §30: minimal read-only badge in
// the Visual Analysis workspace header showing the current
// provider, the current model, fallback availability, and (after
// a run) a status line that distinguishes a fallback from a
// clean success.
//
// The badge is read-only; provider selection happens through the
// existing API profile settings page (apps/web SettingsPanel).
// No provider secret is sent to the renderer; only the provider
// name + model name + the canonical alternative (per A3-A policy)
// are surfaced. Per A2-H §34 + A2-I §33, API keys are never sent
// to the renderer.

import type { ProjectRecord } from '@masterpiece/runtime-core/application-contracts.ts';

// Canonical A3-A alternative (Qwen / qwen3.6-plus); see
// packages/runtime-core/src/application/provider-policy.js.
// Inlined here as a constant so the Web Renderer stays
// self-contained (no cross-package import in the React layer).
const A3_ALTERNATIVE_PROVIDER = 'qwen';
const A3_ALTERNATIVE_MODEL = 'qwen3.6-plus';

interface Props {
  project: ProjectRecord;
  /** Optional run status; when present, the badge surfaces success / fallback / hard-fail. */
  runStatus?: 'succeeded' | 'failed-with-fallback' | 'failed' | null;
  /** Optional error code surfaced when runStatus === 'failed'. */
  runErrorCode?: string | null;
}

function friendlyProvider(provider: string): string {
  if (provider === 'volcengine') return 'Volcengine';
  if (provider === 'qwen') return 'Qwen';
  return provider;
}

function friendlyModel(model: string): string {
  // API alias → display name (per A2 spec §107)
  if (model === 'doubao-seed-2.1-turbo' || model === 'doubao-seed-2-1-turbo-260628') {
    return 'doubao-seed-2-1-turbo-260628';
  }
  return model;
}

export function ProviderBadge({ project, runStatus, runErrorCode }: Props) {
  const provider = project.provider;
  const model = project.model;
  const fallbackAvailable = provider !== A3_ALTERNATIVE_PROVIDER
    ? `${friendlyProvider(A3_ALTERNATIVE_PROVIDER)} · ${friendlyModel(A3_ALTERNATIVE_MODEL)}`
    : null;

  let statusLine: { tone: 'success' | 'warning' | 'error'; text: string } | null = null;
  if (runStatus === 'succeeded') {
    statusLine = { tone: 'success', text: `${friendlyProvider(provider)} succeeded` };
  } else if (runStatus === 'failed-with-fallback') {
    statusLine = {
      tone: 'warning',
      text: `${friendlyProvider(provider)} failed · ${friendlyProvider(A3_ALTERNATIVE_PROVIDER)} fallback used`,
    };
  } else if (runStatus === 'failed') {
    statusLine = {
      tone: 'error',
      text: `${friendlyProvider(provider)} failed${runErrorCode ? `: ${runErrorCode}` : ''}`,
    };
  }

  return (
    <div className="provider-badge" data-provider={provider}>
      <div className="provider-badge-row primary">
        <span className="provider-badge-label">Visual Analysis Provider</span>
        <strong className="provider-badge-name">{friendlyProvider(provider)}</strong>
        <span className="provider-badge-sep">·</span>
        <span className="provider-badge-model">{friendlyModel(model)}</span>
      </div>
      {fallbackAvailable && (
        <div className="provider-badge-row secondary">
          <span className="provider-badge-label">Fallback available</span>
          <span className="provider-badge-fallback">{fallbackAvailable}</span>
        </div>
      )}
      {statusLine && (
        <div className={`provider-badge-row status ${statusLine.tone}`}>{statusLine.text}</div>
      )}
    </div>
  );
}
