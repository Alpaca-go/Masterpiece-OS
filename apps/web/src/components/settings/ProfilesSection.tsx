import type {
  ApiProfile,
  ModelRegistryEntry,
  SaveApiProfileInput,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useSettingsContext } from './SettingsContext';

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

function statusLabel(profile: { lastTestStatus?: string | null }): string {
  if (profile.lastTestStatus === 'success') return '连接正常';
  if (profile.lastTestStatus === 'failed') return '连接失败';
  return '尚未测试';
}

function modelTypeLabel(type?: string): string {
  if (type === 'image_generation') return '图片生成模型';
  if (type === 'video_generation') return '视频生成模型';
  return '分析模型';
}

export function ProfilesSection() {
  const ctx = useSettingsContext();
  const { settings, editor, busy, startAddProfile, startEditProfile } = ctx;
  return (
    <section className="settings-v2__panel" id="section-profiles">
      <div className="settings-v2__section-head">
        <div>
          <span className="project-v2__section-num">01</span>
          <h2>Provider Manager</h2>
          <p>可新增、编辑、测试、启停并设置默认配置</p>
        </div>
        <Button variant="text" size="sm" onClick={startAddProfile}>
          + 添加 API 配置
        </Button>
      </div>

      {settings.profiles.length ? (
        <div className="settings-v2__profiles">
          {settings.profiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} busy={busy} onEdit={() => startEditProfile(profile)} />
          ))}
        </div>
      ) : (
        <div className="settings-v2__empty">
          <strong>尚未配置 API Profile</strong>
          <p>添加任意厂商提供的 OpenAI-compatible 多模态端点后即可开始分析。</p>
          <Button variant="primary" onClick={startAddProfile}>添加第一个配置</Button>
        </div>
      )}

      {editor && <ProfileEditor />}
    </section>
  );
}

function ProfileCard({ profile, busy, onEdit }: { profile: ApiProfile; busy: string; onEdit(): void }) {
  const ctx = useSettingsContext();
  const { perform, testProfile, removeProfile } = ctx;
  return (
    <article className={`settings-v2__profile ${!profile.isEnabled ? 'is-disabled' : ''}`}>
      <div className="settings-v2__profile-head">
        <div className="settings-v2__profile-title">
          <span className={`status-dot ${profile.lastTestStatus === 'success' ? 'connected' : profile.lastTestStatus === 'failed' ? 'failed' : 'untested'}`} />
          <strong>{profile.displayName}</strong>
        </div>
        <div className="settings-v2__profile-tags">
          <Badge size="sm">{modelTypeLabel(profile.modelType)}</Badge>
          {profile.isDefault && <Badge tone="primary" size="sm">默认</Badge>}
          {!profile.isEnabled && <Badge tone="default" size="sm">已停用</Badge>}
        </div>
      </div>
      <dl className="settings-v2__profile-meta">
        <div><dt>Provider</dt><dd>{profile.provider}</dd></div>
        <div><dt>协议</dt><dd>{profile.protocol}</dd></div>
        <div><dt>Model</dt><dd>{profile.modelId}</dd></div>
        <div><dt>状态</dt><dd>{statusLabel(profile)} · {profile.hasApiKey ? 'Key 已保存' : '缺少 Key'}</dd></div>
      </dl>
      <div className="settings-v2__profile-actions">
        <Button variant="secondary" size="sm" disabled={Boolean(busy) || !profile.isEnabled} onClick={() => void testProfile(profileInput(profile), `test-${profile.id}`)}>
          {busy === `test-${profile.id}` ? '测试中…' : '测试连接'}
        </Button>
        <Button variant="ghost" size="sm" disabled={Boolean(busy)} onClick={onEdit}>编辑</Button>
        {!profile.isDefault && (
          <Button variant="ghost" size="sm" disabled={Boolean(busy) || !profile.isEnabled} onClick={() => void perform(`default-${profile.id}`, () => window.masterpiece.settings.setDefaultProfile(profile.id), '默认 API Profile 已更新。')}>
            设为默认
          </Button>
        )}
        <Button variant="ghost" size="sm" disabled={Boolean(busy)} onClick={() => void perform(`enable-${profile.id}`, () => window.masterpiece.settings.setProfileEnabled(profile.id, !profile.isEnabled), profile.isEnabled ? 'API Profile 已停用。' : 'API Profile 已启用。')}>
          {profile.isEnabled ? '停用' : '启用'}
        </Button>
        <Button variant="danger" size="sm" disabled={Boolean(busy)} onClick={() => void removeProfile(profile)}>删除</Button>
      </div>
    </article>
  );
}

function ProfileEditor() {
  const ctx = useSettingsContext();
  const { editor, showKey, busy, registry, setShowKey, selectRegistryModel, updateProfile, saveProfile, testProfile, setEditor } = ctx;
  if (!editor) return null;
  return (
    <div className="settings-v2__editor">
      <div className="settings-v2__section-head compact">
        <div>
          <h2>{editor.id ? '编辑 API 配置' : '新增 API 配置'}</h2>
          <p>API Key 留空时保留已保存的凭据</p>
        </div>
      </div>
      <div className="settings-v2__form-grid">
        <label className="ui-field">
          <span className="ui-field__label">Registry 模型</span>
          <select className="ui-select" value={editor.registryModelId || ''} onChange={(event) => selectRegistryModel(event.target.value)}>
            <option value="">自定义模型</option>
            <optgroup label="Analysis Models">{registry.filter((model) => model.type === 'analysis').map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</optgroup>
            <optgroup label="Generation Models">{registry.filter((model) => model.type === 'image_generation').map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</optgroup>
          </select>
        </label>
        <label className="ui-field">
          <span className="ui-field__label">模型职责</span>
          <select className="ui-select" value={editor.modelType} disabled={Boolean(editor.registryModelId)} onChange={(event) => updateProfile('modelType', event.target.value as SaveApiProfileInput['modelType'])}>
            <option value="analysis">Analysis Model</option>
            <option value="image_generation">Image Generation Model</option>
            <option value="video_generation">Video Generation Model</option>
          </select>
        </label>
      </div>
      <label className="ui-field">
        <span className="ui-field__label">配置名称</span>
        <input className="ui-input" value={editor.displayName} placeholder="例如：千问 VL Plus / GPT Vision / 本地模型" onChange={(event) => updateProfile('displayName', event.target.value)} />
      </label>
      <label className="ui-field">
        <span className="ui-field__label">调用协议</span>
        <select className="ui-select" value={editor.protocol} disabled={Boolean(editor.registryModelId)} onChange={(event) => updateProfile('protocol', event.target.value as SaveApiProfileInput['protocol'])}>
          <option value="openai-chat-multimodal">OpenAI 兼容多模态</option>
          <option value="openai-image-generation">OpenAI Image Generation</option>
          <option value="google-gemini-image">Google Gemini Image</option>
          <option value="seedream-image">Seedream Image</option>
          <option value="dashscope-wan-image">DashScope Wan Image</option>
          <option value="openai-video-generation">Video Generation</option>
        </select>
        <span className="ui-field__hint">协议决定连接测试和 Adapter 请求格式。</span>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">Provider 标识</span>
        <input className="ui-input" list="provider-suggestions" value={editor.provider} placeholder="自由输入，例如 aliyun-bailian" onChange={(event) => updateProfile('provider', event.target.value)} />
        <span className="ui-field__hint">仅作为配置与运行记录标识，不限制厂商；请求接口由模型类型与调用协议共同决定。</span>
      </label>
      <datalist id="provider-suggestions">
        <option value="aliyun-bailian" />
        <option value="openai" />
        <option value="azure-openai" />
        <option value="deepseek" />
        <option value="siliconflow" />
        <option value="openrouter" />
        <option value="local-openai-compatible" />
      </datalist>
      <label className="ui-field">
        <span className="ui-field__label">API Key</span>
        <div className="ui-secret-field">
          <input type={showKey ? 'text' : 'password'} value={editor.apiKey || ''} placeholder={editor.id ? '留空则保持现有 Key' : '输入 API Key'} onChange={(event) => updateProfile('apiKey', event.target.value)} />
          <button type="button" onClick={() => setShowKey(!showKey)}>{showKey ? '隐藏' : '显示'}</button>
        </div>
      </label>
      <div className="settings-v2__form-grid">
        <label className="ui-field">
          <span className="ui-field__label">Base URL</span>
          <input className="ui-input" value={editor.baseUrl} placeholder="https://…/compatible-mode/v1" onChange={(event) => updateProfile('baseUrl', event.target.value)} />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Model ID</span>
          <input className="ui-input" value={editor.modelId} placeholder="输入端点实际支持的多模态 Model ID" onChange={(event) => updateProfile('modelId', event.target.value)} />
        </label>
      </div>
      <div className="settings-v2__toggles">
        <label className="ui-toggle">
          <input type="checkbox" checked={editor.isEnabled} onChange={(event) => updateProfile('isEnabled', event.target.checked)} />
          <span>启用此配置</span>
        </label>
        <label className="ui-toggle">
          <input type="checkbox" checked={editor.isDefault} onChange={(event) => updateProfile('isDefault', event.target.checked)} />
          <span>设为默认配置</span>
        </label>
      </div>
      <div className="settings-v2__editor-actions">
        <Button variant="primary" disabled={Boolean(busy)} onClick={() => void saveProfile()}>{busy === 'profile-save' ? '保存中…' : '保存配置'}</Button>
        <Button variant="secondary" disabled={Boolean(busy)} onClick={() => void testProfile(editor, 'editor-test')}>{busy === 'editor-test' ? '测试中…' : '测试模型连接'}</Button>
        <Button variant="ghost" disabled={Boolean(busy)} onClick={() => setEditor(null)}>取消编辑</Button>
      </div>
    </div>
  );
}
