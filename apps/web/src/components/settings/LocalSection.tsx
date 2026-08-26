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
          <h2>高级本地设置</h2>
          <p>仅在排障或迁移数据时修改</p>
        </div>
      </div>
      <details className="ux-advanced settings-v2__local-advanced">
      <summary>显示开发者设置</summary>
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
        <strong>生成方式</strong>
        <p>当前使用短链路统一生成工作台；历史任务仍可读取。</p>
      </div>
      <Button variant="primary" fullWidth style={{ marginTop: 'var(--space-4)' }} disabled={Boolean(busy)} onClick={() => void saveLocal()}>
        {busy === 'local' ? '保存中…' : '保存本地设置'}
      </Button>
      <div className="settings-v2__info-card" style={{ marginTop: 'var(--space-4)' }}>
        <strong>凭据安全</strong>
        <p>API Key 会在本机加密保存，仅在请求模型服务时读取。删除配置会同步删除对应凭据。</p>
      </div>
      </details>
    </section>
  );
}
