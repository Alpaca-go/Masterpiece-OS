import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type {
  ApiProfile,
  ConnectionTestResult,
  PublicSettings,
  SaveApiProfileInput,
  SaveSettingsInput,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { cleanError } from '../utils';
import { PageShell } from './PageShell';
import { SettingsContext, type SettingsContextValue } from './settings/SettingsContext';
import { ProfilesSection } from './settings/ProfilesSection';
import { LocalSection } from './settings/LocalSection';
import { SettingsNav } from './settings/SettingsNav';
import { ResearchServicesSection } from './settings/ResearchServicesSection';
import { useConfirm } from './ui/ConfirmDialog';

interface Props {
  settings: PublicSettings;
  onSaved(settings: PublicSettings): void;
  onClose(): void;
}

function profileInput(profile?: ApiProfile): SaveApiProfileInput {
  return {
    id: profile?.id,
    displayName: profile?.displayName || '',
    provider: profile?.provider || '',
    protocol: profile?.protocol || 'openai-chat-multimodal',
    modelType: profile?.modelType || 'analysis',
    registryModelId: profile?.registryModelId,
    modelId: profile?.modelId || '',
    baseUrl: profile?.baseUrl || '',
    apiKey: '',
    isDefault: profile?.isDefault || false,
    isEnabled: profile?.isEnabled ?? true
  };
}

/**
 * Settings — Stripe / Vercel style two-column layout.
 *
 *   ┌─────────────────┬──────────────────────────────────────────┐
 *   │ SettingsNav     │  ProfilesSection (Provider Manager)      │
 *   │ (sticky left    │                                          │
 *   │  rail)          │  RegistrySection (Model Registry)        │
 *   │                 │                                          │
 *   │                 │  LocalSection (本地行为)                 │
 *   └─────────────────┴──────────────────────────────────────────┘
 *
 * Owns all state (form, editor, notice, busy) via SettingsContext.
 * Children are pure UI: they consume the context and call back.
 *
 * ZERO business logic change vs the inline monolith: every IPC call,
 * state transition, and event handler is preserved verbatim — only the
 * JSX structure is decomposed across files.
 */
export function SettingsPanel({ settings, onSaved, onClose }: Props) {
  const location = useLocation();
  const registry = settings.modelRegistry ?? [];
  const [localForm, setLocalForm] = useState<SaveSettingsInput>({
    defaultDataPath: settings.defaultDataPath,
    cacheEnabled: settings.cacheEnabled,
    logLevel: settings.logLevel,
    imageGenerationPipelineMode: settings.imageGenerationPipelineMode ?? 'vnext'
  });
  const [editor, setEditor] = useState<SaveApiProfileInput | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState('');
  const { confirm } = useConfirm();
  const [notice, setNotice] = useState<{
    tone: 'ok' | 'error';
    text: string;
    connectionResult?: ConnectionTestResult;
  } | null>(null);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('section') !== 'research-services') return;
    const frame = window.requestAnimationFrame(() => {
      const section = document.getElementById('section-research-services');
      section?.scrollIntoView({ block: 'start' });
      section?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.search]);

  const updateLocal = <K extends keyof SaveSettingsInput>(key: K, value: SaveSettingsInput[K]) => {
    setLocalForm((current) => ({ ...current, [key]: value }));
  };
  const updateProfile = <K extends keyof SaveApiProfileInput>(key: K, value: SaveApiProfileInput[K]) => {
    setEditor((current) => current ? { ...current, [key]: value } : current);
  };
  const selectRegistryModel = (registryModelId: string) => {
    const model = registry.find((item) => item.id === registryModelId);
    setEditor((current) => current && model ? {
      ...current,
      registryModelId: model.id,
      displayName: current.displayName || model.name,
      provider: model.provider,
      protocol: model.protocol,
      modelType: model.type,
      modelId: model.id,
      baseUrl: current.registryModelId === model.id ? current.baseUrl : model.defaultBaseUrl || '',
    } : current ? { ...current, registryModelId: undefined } : current);
  };

  async function perform(key: string, action: () => Promise<PublicSettings>, message: string) {
    setBusy(key);
    setNotice(null);
    try {
      const next = await action();
      onSaved(next);
      setNotice({ tone: 'ok', text: message });
      return next;
    } catch (error) {
      setNotice({ tone: 'error', text: cleanError(error) });
      return null;
    } finally {
      setBusy('');
    }
  }

  async function saveLocal() {
    await perform('local', () => window.masterpiece.settings.save(localForm), '本地设置已保存。');
  }

  async function saveProfile() {
    if (!editor) return;
    const next = await perform(
      'profile-save',
      () => window.masterpiece.settings.saveProfile(editor),
      'API Profile 已保存，Key 已写入独立的系统安全凭据文件。'
    );
    if (next) {
      setEditor(null);
      setShowKey(false);
    }
  }

  async function testProfile(input: SaveApiProfileInput, busyKey: string) {
    setBusy(busyKey);
    setNotice(null);
    try {
      const result = await window.masterpiece.settings.testProfile(input);
      onSaved(await window.masterpiece.settings.get());
      setNotice({
        tone: result.ok ? 'ok' : 'error',
        text: `${result.message} · ${result.elapsedMs} ms`,
        connectionResult: result,
      });
    } catch (error) {
      onSaved(await window.masterpiece.settings.get().catch(() => settings));
      setNotice({ tone: 'error', text: cleanError(error) });
    } finally {
      setBusy('');
    }
  }

  async function verifyAndSaveProfile() {
    if (!editor) return;
    setBusy('profile-verify-save');
    setNotice(null);
    try {
      const result = await window.masterpiece.settings.testProfile(editor);
      if (!result.ok) {
        onSaved(await window.masterpiece.settings.get().catch(() => settings));
        setNotice({ tone: 'error', text: result.message, connectionResult: result });
        return;
      }
      const next = await window.masterpiece.settings.saveProfile(editor);
      onSaved(next);
      setNotice({ tone: 'ok', text: `连接验证通过，配置已保存 · ${result.elapsedMs} ms` });
      setEditor(null);
      setShowKey(false);
    } catch (error) {
      setNotice({ tone: 'error', text: cleanError(error) });
    } finally {
      setBusy('');
    }
  }

  async function removeProfile(profile: ApiProfile) {
    const ok = await confirm({
      title: '删除 API Profile',
      message: `确定删除 API Profile"${profile.displayName}"吗？\n对应的安全凭据也会同步删除。`,
      confirmText: '删除',
      tone: 'destructive',
    });
    if (!ok) return;
    await perform(
      `delete-${profile.id}`,
      () => window.masterpiece.settings.deleteProfile(profile.id),
      `已删除"${profile.displayName}"及其安全凭据。`
    );
    if (editor?.id === profile.id) setEditor(null);
  }

  function startAddProfile() {
    const model = registry.find((item) => item.enabledByDefault) || registry[0];
    setEditor(model ? {
      ...profileInput(),
      displayName: model.name,
      registryModelId: model.id,
      provider: model.provider,
      protocol: model.protocol,
      modelType: model.type,
      modelId: model.id,
      baseUrl: model.defaultBaseUrl || '',
    } : profileInput());
    setShowKey(false);
  }
  function startEditProfile(profile: ApiProfile) {
    setEditor(profileInput(profile));
    setShowKey(false);
  }

  const ctx: SettingsContextValue = {
    settings, registry,
    localForm, editor, showKey, busy, notice,
    updateLocal, updateProfile, selectRegistryModel, setShowKey, setEditor,
    perform, testProfile, verifyAndSaveProfile, saveProfile, saveLocal, removeProfile,
    startAddProfile, startEditProfile,
  };

  return (
    <PageShell
      eyebrow="模型中心"
      title="API 与模型"
      subtitle="连接分析与图像生成服务；通常只需选择模型并填写 API Key。"
      onBack={onClose}
      backLabel="返回"
    >
      <SettingsContext.Provider value={ctx}>
        {notice && (
          <div className={`settings-v2__notice notice ${notice.tone}`}>
            <strong>{notice.text}</strong>
            {notice.connectionResult && !notice.connectionResult.ok && (
              <details className="ux-advanced"><summary>查看技术详情</summary><dl className="connection-error-details">
                <div><dt>上游服务</dt><dd>{notice.connectionResult.provider || '未知'}</dd></div>
                <div><dt>请求接口类型</dt><dd>{notice.connectionResult.requestInterface || '未知'}</dd></div>
                <div><dt>HTTP 状态码</dt><dd>{notice.connectionResult.httpStatus ?? '未收到响应'}</dd></div>
                <div><dt>上游错误码</dt><dd>{notice.connectionResult.upstreamErrorCode || '未提供'}</dd></div>
                <div><dt>上游错误信息</dt><dd>{notice.connectionResult.upstreamErrorMessage || '未提供'}</dd></div>
                <div><dt>request id</dt><dd>{notice.connectionResult.requestId || '未提供'}</dd></div>
                {notice.connectionResult.responseBody && (
                  <div className="connection-response-body">
                    <dt>response body</dt>
                    <dd><pre>{notice.connectionResult.responseBody}</pre></dd>
                  </div>
                )}
              </dl></details>
            )}
          </div>
        )}

        <div className="settings-v2__grid settings-v2__grid--arch">
          <SettingsNav items={[
            { id: 'section-profiles', label: '模型服务', hint: '连接与凭据' },
            { id: 'section-research-services', label: '研究服务', hint: '外部搜索' },
            { id: 'section-local', label: '高级设置', hint: '目录 · 缓存 · 日志' },
          ]} />
          <div className="settings-v2__content">
            <ProfilesSection />
            <ResearchServicesSection />
            <LocalSection />
          </div>
        </div>
      </SettingsContext.Provider>
    </PageShell>
  );
}
