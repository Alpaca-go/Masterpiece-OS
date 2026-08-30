import { useEffect, useState } from 'react';
import type { CreativeResearchCredentialStatusDto } from '@masterpiece/runtime-core/application-contracts.ts';
import { cleanError } from '../../utils';
import { Button } from '../ui/Button';
import { useConfirm } from '../ui/ConfirmDialog';

const EMPTY_STATUS: CreativeResearchCredentialStatusDto = {
  provider: 'baidu-search',
  configured: false,
};

export function ResearchServicesSection() {
  const [status, setStatus] = useState<CreativeResearchCredentialStatusDto>(EMPTY_STATUS);
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState('loading');
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const { confirm } = useConfirm();

  useEffect(() => {
    let active = true;
    void window.masterpiece.creativeResearch.getSearchCredentialStatus()
      .then((next) => { if (active) setStatus(next); })
      .catch((reason) => { if (active) setNotice({ tone: 'error', text: cleanError(reason) }); })
      .finally(() => { if (active) setBusy(''); });
    return () => { active = false; };
  }, []);

  async function saveCredential() {
    if (!apiKey.trim()) {
      setNotice({ tone: 'error', text: '请输入百度 AI 搜索 API Key。' });
      return;
    }
    setBusy('saving');
    setNotice(null);
    try {
      setStatus(await window.masterpiece.creativeResearch.saveSearchCredential(apiKey));
      setApiKey('');
      setNotice({ tone: 'ok', text: status.configured ? '百度 AI 搜索凭据已更新。' : '百度 AI 搜索凭据已保存。' });
    } catch (reason) {
      setNotice({ tone: 'error', text: cleanError(reason) });
    } finally {
      setBusy('');
    }
  }

  async function deleteCredential() {
    const approved = await confirm({
      title: '删除百度 AI 搜索凭据',
      message: '删除后，灵感研究将无法搜索公开网页与视觉参考，直到重新配置凭据。',
      confirmText: '删除凭据',
      tone: 'destructive',
    });
    if (!approved) return;
    setBusy('deleting');
    setNotice(null);
    try {
      setStatus(await window.masterpiece.creativeResearch.deleteSearchCredential());
      setApiKey('');
      setNotice({ tone: 'ok', text: '百度 AI 搜索凭据已删除。' });
    } catch (reason) {
      setNotice({ tone: 'error', text: cleanError(reason) });
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="settings-v2__panel" id="section-research-services" tabIndex={-1}>
      <div className="settings-v2__section-head">
        <div>
          <span className="project-v2__section-num">02</span>
          <h2>研究服务</h2>
          <p>统一管理灵感研究使用的外部检索服务</p>
        </div>
      </div>

      <article className="research-service-card">
        <header className="research-service-card__head">
          <div>
            <strong>百度 AI 搜索</strong>
            <p>用于灵感研究工作台的网页参考搜索与图片参考搜索。</p>
          </div>
          <span className={`research-service-status ${status.configured ? 'is-configured' : ''}`}>
            <span aria-hidden>●</span>{busy === 'loading' ? '正在检查' : status.configured ? '已配置' : '未配置'}
          </span>
        </header>

        <label className="ui-field">
          <span className="ui-field__label">API Key</span>
          <input
            className="ui-input"
            type="password"
            autoComplete="off"
            value={apiKey}
            disabled={Boolean(busy)}
            placeholder={status.configured ? '输入新 API Key 以覆盖现有凭据' : '输入百度 AI 搜索 API Key'}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <small>{status.configured ? '已保存的 Key 不会回传或显示；留空不会改变现有凭据。' : '凭据仅交给 Runtime 安全存储，不会写入普通设置。'}</small>
        </label>

        {notice && <div className={`notice ${notice.tone}`}>{notice.text}</div>}
        <div className="research-service-card__actions">
          <Button variant="primary" size="sm" disabled={Boolean(busy) || !apiKey.trim()} onClick={() => void saveCredential()}>
            {busy === 'saving' ? '保存中…' : status.configured ? '更新 API Key' : '保存凭据'}
          </Button>
          {status.configured && <Button variant="danger" size="sm" disabled={Boolean(busy)} onClick={() => void deleteCredential()}>
            {busy === 'deleting' ? '删除中…' : '删除凭据'}
          </Button>}
        </div>
      </article>
    </section>
  );
}
