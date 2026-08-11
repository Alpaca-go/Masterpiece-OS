import { useState } from 'react';
import type {
  ApiProfile,
  ConnectionTestResult,
  PublicSettings,
  SaveApiProfileInput,
  SaveSettingsInput
} from '@masterpiece/runtime-core/application-contracts.ts';
import { cleanError } from '../utils';

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

function statusLabel(profile: ApiProfile): string {
  if (profile.lastTestStatus === 'success') return '连接正常';
  if (profile.lastTestStatus === 'failed') return '连接失败';
  return '尚未测试';
}

export function SettingsPanel({ settings, onSaved, onClose }: Props) {
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
  const [notice, setNotice] = useState<{
    tone: 'ok' | 'error';
    text: string;
    connectionResult?: ConnectionTestResult;
  } | null>(null);

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

  async function removeProfile(profile: ApiProfile) {
    if (!window.confirm(`确定删除 API Profile“${profile.displayName}”吗？\n对应的安全凭据也会同步删除。`)) return;
    await perform(
      `delete-${profile.id}`,
      () => window.masterpiece.settings.deleteProfile(profile.id),
      `已删除“${profile.displayName}”及其安全凭据。`
    );
    if (editor?.id === profile.id) setEditor(null);
  }

  return <div className="page settings-page">
    <header className="page-header">
      <div><p className="eyebrow">MODEL CENTER</p><h1>API 与模型</h1><p>分析模型与生成模型职责隔离；每个 Provider Key 独立加密。</p></div>
      <button className="button ghost" onClick={onClose}>返回</button>
    </header>

    {notice && <div className={`notice ${notice.tone}`}>
      <strong>{notice.text}</strong>
      {notice.connectionResult && !notice.connectionResult.ok && <dl className="connection-error-details">
        <div><dt>上游服务</dt><dd>{notice.connectionResult.provider || '未知'}</dd></div>
        <div><dt>请求接口类型</dt><dd>{notice.connectionResult.requestInterface || '未知'}</dd></div>
        <div><dt>HTTP 状态码</dt><dd>{notice.connectionResult.httpStatus ?? '未收到响应'}</dd></div>
        <div><dt>上游错误码</dt><dd>{notice.connectionResult.upstreamErrorCode || '未提供'}</dd></div>
        <div><dt>上游错误信息</dt><dd>{notice.connectionResult.upstreamErrorMessage || '未提供'}</dd></div>
        <div><dt>request id</dt><dd>{notice.connectionResult.requestId || '未提供'}</dd></div>
        {notice.connectionResult.responseBody && <div className="connection-response-body">
          <dt>response body</dt>
          <dd><pre>{notice.connectionResult.responseBody}</pre></dd>
        </div>}
      </dl>}
    </div>}

    <div className="settings-grid">
      <section className="panel form-panel">
        <div className="section-heading">
          <span>01</span>
          <div><h2>Provider Manager</h2><p>可新增、编辑、测试、启停并设置默认配置</p></div>
          <button className="button text-button" onClick={() => { setEditor(profileInput()); setShowKey(false); }}>+ 添加 API 配置</button>
        </div>

        {settings.profiles.length ? <div className="profile-list">
          {settings.profiles.map((profile) => <article className={`api-profile-card ${profile.isEnabled ? '' : 'disabled'}`} key={profile.id}>
            <div className="api-profile-title">
              <div>
                <span className={`status-dot ${profile.lastTestStatus === 'success' ? 'connected' : profile.lastTestStatus === 'failed' ? 'failed' : 'untested'}`} />
                <strong>{profile.displayName}</strong>
              </div>
              <div className="profile-tags"><span>{profile.modelType === 'image_generation'
                ? '图片生成模型'
                : profile.modelType === 'video_generation'
                  ? '视频生成模型'
                  : '分析模型'}</span>{profile.isDefault && <span>默认</span>}{!profile.isEnabled && <span>已停用</span>}</div>
            </div>
            <dl>
              <div><dt>Provider</dt><dd>{profile.provider}</dd></div>
              <div><dt>协议</dt><dd>{profile.protocol}</dd></div>
              <div><dt>Model</dt><dd>{profile.modelId}</dd></div>
              <div><dt>状态</dt><dd>{statusLabel(profile)} · {profile.hasApiKey ? 'Key 已保存' : '缺少 Key'}</dd></div>
            </dl>
            <div className="button-row compact-buttons">
              <button className="button secondary" disabled={Boolean(busy) || !profile.isEnabled} onClick={() => void testProfile(profileInput(profile), `test-${profile.id}`)}>{busy === `test-${profile.id}` ? '测试中…' : '测试连接'}</button>
              <button className="button ghost" disabled={Boolean(busy)} onClick={() => { setEditor(profileInput(profile)); setShowKey(false); }}>编辑</button>
              {!profile.isDefault && <button className="button ghost" disabled={Boolean(busy) || !profile.isEnabled} onClick={() => void perform(`default-${profile.id}`, () => window.masterpiece.settings.setDefaultProfile(profile.id), '默认 API Profile 已更新。')}>设为默认</button>}
              <button className="button ghost" disabled={Boolean(busy)} onClick={() => void perform(`enable-${profile.id}`, () => window.masterpiece.settings.setProfileEnabled(profile.id, !profile.isEnabled), profile.isEnabled ? 'API Profile 已停用。' : 'API Profile 已启用。')}>{profile.isEnabled ? '停用' : '启用'}</button>
              <button className="button danger" disabled={Boolean(busy)} onClick={() => void removeProfile(profile)}>删除</button>
            </div>
          </article>)}
        </div> : <div className="empty-profile-list"><strong>尚未配置 API Profile</strong><p>添加任意厂商提供的 OpenAI-compatible 多模态端点后即可开始分析。</p><button className="button primary" onClick={() => setEditor(profileInput())}>添加第一个配置</button></div>}

        {editor && <div className="profile-editor">
          <div className="section-heading compact"><span>+</span><div><h2>{editor.id ? '编辑 API 配置' : '新增 API 配置'}</h2><p>API Key 留空时保留已保存的凭据</p></div></div>
          <label>Registry 模型<select value={editor.registryModelId || ''} onChange={(event) => selectRegistryModel(event.target.value)}>
            <option value="">自定义模型</option>
            <optgroup label="Analysis Models">{registry.filter((model) => model.type === 'analysis').map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</optgroup>
            <optgroup label="Generation Models">{registry.filter((model) => model.type === 'image_generation').map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</optgroup>
          </select></label>
          <label>模型职责<select value={editor.modelType} disabled={Boolean(editor.registryModelId)} onChange={(event) => updateProfile('modelType', event.target.value as SaveApiProfileInput['modelType'])}><option value="analysis">Analysis Model</option><option value="image_generation">Image Generation Model</option><option value="video_generation">Video Generation Model</option></select></label>
          <label>配置名称<input value={editor.displayName} placeholder="例如：千问 VL Plus / GPT Vision / 本地模型" onChange={(event) => updateProfile('displayName', event.target.value)} /></label>
          <label>调用协议<select value={editor.protocol} disabled={Boolean(editor.registryModelId)} onChange={(event) => updateProfile('protocol', event.target.value as SaveApiProfileInput['protocol'])}><option value="openai-chat-multimodal">OpenAI 兼容多模态</option><option value="openai-image-generation">OpenAI Image Generation</option><option value="google-gemini-image">Google Gemini Image</option><option value="seedream-image">Seedream Image</option><option value="dashscope-wan-image">DashScope Wan Image</option><option value="openai-video-generation">Video Generation</option></select><small className="field-help">协议决定连接测试和 Adapter 请求格式。</small></label>
          <label>Provider 标识<input list="provider-suggestions" value={editor.provider} placeholder="自由输入，例如 aliyun-bailian" onChange={(event) => updateProfile('provider', event.target.value)} /><small className="field-help">仅作为配置与运行记录标识，不限制厂商；请求接口由模型类型与调用协议共同决定。</small></label>
          <datalist id="provider-suggestions">
            <option value="aliyun-bailian" />
            <option value="openai" />
            <option value="azure-openai" />
            <option value="deepseek" />
            <option value="siliconflow" />
            <option value="openrouter" />
            <option value="local-openai-compatible" />
          </datalist>
          <label>API Key<div className="secret-field"><input type={showKey ? 'text' : 'password'} value={editor.apiKey || ''} placeholder={editor.id ? '留空则保持现有 Key' : '输入 API Key'} onChange={(event) => updateProfile('apiKey', event.target.value)} /><button onClick={() => setShowKey(!showKey)} type="button">{showKey ? '隐藏' : '显示'}</button></div></label>
          <label>Base URL<input value={editor.baseUrl} placeholder="https://…/compatible-mode/v1" onChange={(event) => updateProfile('baseUrl', event.target.value)} /></label>
          <label>Model ID<input value={editor.modelId} placeholder="输入端点实际支持的多模态 Model ID" onChange={(event) => updateProfile('modelId', event.target.value)} /></label>
          <div className="field-grid">
            <label className="toggle"><input type="checkbox" checked={editor.isEnabled} onChange={(event) => updateProfile('isEnabled', event.target.checked)} /><span>启用此配置</span></label>
            <label className="toggle"><input type="checkbox" checked={editor.isDefault} onChange={(event) => updateProfile('isDefault', event.target.checked)} /><span>设为默认配置</span></label>
          </div>
          <div className="button-row">
            <button className="button primary" disabled={Boolean(busy)} onClick={() => void saveProfile()}>{busy === 'profile-save' ? '保存中…' : '保存配置'}</button>
            <button className="button secondary" disabled={Boolean(busy)} onClick={() => void testProfile(editor, 'editor-test')}>{busy === 'editor-test' ? '测试中…' : '测试模型连接'}</button>
            <button className="button ghost" disabled={Boolean(busy)} onClick={() => setEditor(null)}>取消编辑</button>
          </div>
        </div>}
      </section>

      <aside className="panel side-panel">
        <div className="section-heading"><span>02</span><div><h2>Model Registry</h2><p>Think Once, Compile Many</p></div></div>
        <div className="security-card"><strong>Analysis Models</strong><p>{registry.filter((model) => model.type === 'analysis').map((model) => model.name).join(' · ') || '未注册'}</p></div>
        <div className="security-card"><strong>Generation Models</strong><p>{registry.filter((model) => model.type === 'image_generation' && model.enabledByDefault).map((model) => model.name).join(' · ') || '未注册'}</p></div>
        <div className="section-heading"><span>03</span><div><h2>本地行为</h2><p>项目数据始终位于仓库之外</p></div></div>
        <label>项目数据目录<input value={localForm.defaultDataPath} onChange={(event) => updateLocal('defaultDataPath', event.target.value)} /></label>
        <label className="toggle"><input type="checkbox" checked={localForm.cacheEnabled} onChange={(event) => updateLocal('cacheEnabled', event.target.checked)} /><span>启用视觉准备与精确结果缓存</span></label>
        <label>日志级别<select value={localForm.logLevel} onChange={(event) => updateLocal('logLevel', event.target.value as SaveSettingsInput['logLevel'])}><option value="error">仅错误</option><option value="info">标准</option><option value="debug">调试</option></select></label>
        <div className="security-card">
          <strong>生图主链路</strong>
          <p>短链路（生成工作台）— Masterpiece OS 5 的唯一生图路径。历史 Legacy 数据仍可读取，但不再创建新的 Legacy 生图任务。</p>
        </div>
        <button className="button primary full" disabled={Boolean(busy)} onClick={() => void saveLocal()}>{busy === 'local' ? '保存中…' : '保存本地设置'}</button>
        <div className="security-card"><strong>本地加密存储</strong><p>每个 API Key 使用 Node Host 的 AES-256-GCM 凭据存储独立加密，仅在发起 Provider 请求时短暂读取。删除 Profile 会同步删除对应凭据。</p></div>
      </aside>
    </div>
  </div>;
}
