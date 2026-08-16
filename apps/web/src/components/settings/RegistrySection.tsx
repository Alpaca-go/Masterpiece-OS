import { useSettingsContext } from './SettingsContext';

export function RegistrySection() {
  const { registry } = useSettingsContext();
  return (
    <section className="settings-v2__panel" id="section-registry">
      <div className="settings-v2__section-head">
        <div>
          <span className="project-v2__section-num">02</span>
          <h2>Model Registry</h2>
          <p>Think Once, Compile Many</p>
        </div>
      </div>
      <div className="settings-v2__info-card">
        <strong>Analysis Models</strong>
        <p>{registry.filter((model) => model.type === 'analysis').map((model) => model.name).join(' · ') || '未注册'}</p>
      </div>
      <div className="settings-v2__info-card">
        <strong>Generation Models</strong>
        <p>{registry.filter((model) => model.type === 'image_generation' && model.enabledByDefault).map((model) => model.name).join(' · ') || '未注册'}</p>
      </div>
    </section>
  );
}
