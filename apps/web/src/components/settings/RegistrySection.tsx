import { useSettingsContext } from './SettingsContext';

export function RegistrySection() {
  const { registry } = useSettingsContext();
  return (
    <section className="settings-v2__panel" id="section-registry">
      <div className="settings-v2__section-head">
        <div>
          <span className="project-v2__section-num">02</span>
          <h2>模型注册表</h2>
          <p>统一管理分析与图像生成模型</p>
        </div>
      </div>
      <div className="settings-v2__info-card">
        <strong>分析模型</strong>
        <p>{registry.filter((model) => model.type === 'analysis').map((model) => model.name).join(' · ') || '未注册'}</p>
      </div>
      <div className="settings-v2__info-card">
        <strong>图像生成模型</strong>
        <p>{registry.filter((model) => model.type === 'image_generation' && model.enabledByDefault).map((model) => model.name).join(' · ') || '未注册'}</p>
      </div>
    </section>
  );
}
