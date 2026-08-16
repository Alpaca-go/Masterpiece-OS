import type { SaveSettingsInput } from '@masterpiece/runtime-core/application-contracts.ts';
import { Button } from '../ui/Button';
import { useSettingsContext } from './SettingsContext';

export function LocalSection() {
  const ctx = useSettingsContext();
  const { localForm, busy, updateLocal, saveLocal } = ctx;
  return (
    <section className="settings-v2__panel" id="section-local">
      <div className="settings-v2__section-head">
        <div>
          <span className="project-v2__section-num">03</span>
          <h2>本地行为</h2>
          <p>项目数据始终位于仓库之外</p>
        </div>
      </div>
      <label className="ui-field">
        <span className="ui-field__label">项目数据目录</span>
        <input className="ui-input" value={localForm.defaultDataPath} onChange={(event) => updateLocal('defaultDataPath', event.target.value)} />
      </label>
      <label className="ui-toggle" style={{ marginBottom: 'var(--space-4)' }}>
        <input type="checkbox" checked={localForm.cacheEnabled} onChange={(event) => updateLocal('cacheEnabled', event.target.checked)} />
        <span>启用视觉准备与精确结果缓存</span>
      </label>
      <label className="ui-field">
        <span className="ui-field__label">日志级别</span>
        <select className="ui-select" value={localForm.logLevel} onChange={(event) => updateLocal('logLevel', event.target.value as SaveSettingsInput['logLevel'])}>
          <option value="error">仅错误</option>
          <option value="info">标准</option>
          <option value="debug">调试</option>
        </select>
      </label>
      <div className="settings-v2__info-card" style={{ marginTop: 'var(--space-4)' }}>
        <strong>生图主链路</strong>
        <p>短链路（生成工作台）— Masterpiece OS 5 的唯一生图路径。历史 Legacy 数据仍可读取，但不再创建新的 Legacy 生图任务。</p>
      </div>
      <Button variant="primary" fullWidth style={{ marginTop: 'var(--space-4)' }} disabled={Boolean(busy)} onClick={() => void saveLocal()}>
        {busy === 'local' ? '保存中…' : '保存本地设置'}
      </Button>
      <div className="settings-v2__info-card" style={{ marginTop: 'var(--space-4)' }}>
        <strong>本地加密存储</strong>
        <p>每个 API Key 使用 Node Host 的 AES-256-GCM 凭据存储独立加密，仅在发起 Provider 请求时短暂读取。删除 Profile 会同步删除对应凭据。</p>
      </div>
    </section>
  );
}
