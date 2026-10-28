import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { filePayload, workflowCall, createStandardGenerationInput, DEFAULT_STYLE_CONTROLS, type StyleControls, type WorkflowOptions, type WorkflowProfile, type WorkflowProject, type WorkflowRun, type WorkflowSettings, type ProjectDesignDirection } from './api';
import { ProjectDesignDirectionPanel } from './ProjectDesignDirectionPanel';
import './visual-workflow.css';

const FAMILY_LABELS: Record<string, string> = { space: '空间效果图', packaging: '包装效果图', vi: 'VI 应用', poster: '海报' };
const LABELS: Record<string, string> = { reception: '前台接待区', lobby: '大堂', consultation: '咨询室', entrance: '入口空间', storefront: '门店外立面', dining: '用餐区', exhibition: '展陈空间', treatment_room: '服务操作间', entrance_view: '入口视角', eye_level: '平视', wide_angle: '广角', detail_closeup: '局部细节', three_quarter_hero: '四分之三视角', front: '正面', subject_centered: '主体居中', lid_and_base_box: '天地盖盒', business_card: '名片', brand_key_visual: '品牌主视觉' };
const STEPS = ['导入素材', '视觉分析', '查看报告', '智能生图'];
const DEFAULTS: Record<string, [string, string]> = { space: ['reception', 'entrance_view'], packaging: ['lid_and_base_box', 'three_quarter_hero'], vi: ['business_card', 'front'], poster: ['brand_key_visual', 'subject_centered'] };
const STYLE_FIELDS: Array<{ key: keyof StyleControls; label: string; options: Array<[string, string]> }> = [
  { key: 'lighting', label: '光照', options: [['designer_choice', '跟随分析'], ['bright', '明亮'], ['warm_dim', '暖黄偏暗'], ['natural', '自然光']] },
  { key: 'density', label: '密度', options: [['designer_choice', '跟随分析'], ['sparse', '疏'], ['balanced', '中'], ['dense', '密']] },
  { key: 'materials', label: '材质', options: [['designer_choice', '跟随分析'], ['brick_wood', '砖木铜'], ['metal', '金属玻璃'], ['stone', '石材'], ['plaster', '涂料'], ['mixed', '混合']] },
  { key: 'brandColorArea', label: '品牌色面积', options: [['designer_choice', '跟随分析'], ['accent', '点缀'], ['half', '约一半'], ['dominant', '主导']] },
  { key: 'tradition', label: '传统度', options: [['designer_choice', '跟随分析'], ['modern', '现代'], ['balanced', '平衡'], ['traditional', '传统']] },
  { key: 'props', label: '生活道具', options: [['designer_choice', '跟随分析'], ['none', '无'], ['lived_in', '有（仅素材支持）']] },
  { key: 'shot', label: '镜头', options: [['designer_choice', '跟随分析'], ['entrance', '门头'], ['interior', '室内'], ['detail', '细节']] },
  { key: 'textDensity', label: '文字密度', options: [['designer_choice', '跟随分析'], ['minimal', '少'], ['moderate', '中'], ['rich', '多']] },
  { key: 'priceDisplay', label: '价格显示', options: [['none', '不出现数字'], ['real_menu', '仅真实菜单'], ['placeholder', '占位']] }
];
const statusLabels: Record<string, string> = { draft: '待导入', ready: '待分析', running: '分析中', completed: '已完成', failed: '失败', cancelled: '已取消' };

export function VisualWorkflowWorkspace({ onBack }: { onBack: () => void }) {
  const location = useLocation();
  const legacyId = new URLSearchParams(location.search).get('import');
  const [settings, setSettings] = useState<WorkflowSettings | null>(null);
  const openedImport = useRef('');
  const [projects, setProjects] = useState<WorkflowProject[]>([]);
  const [project, setProject] = useState<WorkflowProject | null>(null);
  const [options, setOptions] = useState<WorkflowOptions>({});
  const [step, setStep] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [report, setReport] = useState('');
  const [image, setImage] = useState('');
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [resultLabel, setResultLabel] = useState('');
  const [designDirection,setDesignDirection]=useState<ProjectDesignDirection | null>(null);
  const [directionUnsaved,setDirectionUnsaved]=useState(false);
  const [directionRefresh,setDirectionRefresh]=useState(0);
  const [logoPlacement, setLogoPlacement] = useState({x:50,y:30,width:12});
  const [removeLogoBackground,setRemoveLogoBackground] = useState(false);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [family, setFamily] = useState('space');
  const [subtype, setSubtype] = useState('reception');
  const [shot, setShot] = useState('entrance_view');
  const [shotExplicit, setShotExplicit] = useState(false);
  const [ratio, setRatio] = useState('16:9');
  const [instruction, setInstruction] = useState('生成符合项目气质的空间效果图');
  const [include, setInclude] = useState('');
  const [avoid, setAvoid] = useState('');
  const [styleControls, setStyleControls] = useState<StyleControls>(DEFAULT_STYLE_CONTROLS);
  const [profile, setProfile] = useState({ name: '', provider: 'dashscope', modelType: 'analysis', modelId: '', baseUrl: '', apiKey: '', protocol: 'openai-chat-multimodal' });

  async function refresh() {
    const [nextSettings, nextProjects, nextOptions] = await Promise.all([
      workflowCall<WorkflowSettings>('settings'), workflowCall<WorkflowProject[]>('list-projects'), workflowCall<WorkflowOptions>('options'),
    ]);
    setSettings(nextSettings); setProjects(nextProjects); setOptions(nextOptions);
    setProject(current => current ? nextProjects.find(item => item.id === current.id) || null : null);
    return nextProjects;
  }
  useEffect(() => { void refresh().catch(reason => setError(String(reason.message))); }, []);
  useEffect(() => {
    const imported = projects.find(item => item.id === legacyId);
    if (legacyId && imported && openedImport.current !== legacyId) {
      openedImport.current = legacyId;
      void open(imported).catch(reason => setError(String(reason.message)));
    }
  }, [legacyId, projects]);
  useEffect(() => {
    const source = new EventSource('/_masterpiece/events');
    const onAnalysis = (event: Event) => { const value = JSON.parse((event as MessageEvent<string>).data); if (value.projectId === project?.id) setProgress(value.message); };
    const onImage = (event: Event) => { const value = JSON.parse((event as MessageEvent<string>).data) as WorkflowRun & {projectId: string}; if (value.projectId === project?.id) setRun(value); };
    source.addEventListener('visual-workflow:analysis-progress', onAnalysis);
    source.addEventListener('visual-workflow:image-progress', onImage);
    return () => source.close();
  }, [project?.id]);
  async function action(label: string, task: () => Promise<void>) {
    if (busy) return;
    setBusy(label); setError('');
    try { await task(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(''); await refresh().catch(() => {}); }
  }
  async function open(item: WorkflowProject) {
    setName(item.projectName);setIndustry(item.industry);
    setDesignDirection(null);setDirectionUnsaved(false);
    setProject(item); setReport(''); setImage(''); setRun(null); setResultLabel(''); setStep(item.status === 'completed' ? 2 : 0);
    if (item.lastReportFilename) setReport(await workflowCall<string>('report', item.id) || '');
    const runs = await workflowCall<WorkflowRun[]>('runs', item.id);
    const succeeded = runs.find(candidate => candidate.status === 'succeeded' && candidate.images[0]);
    if (succeeded?.images[0]) { setRun(succeeded); setImage((await workflowCall<{dataUrl: string}>('image', succeeded.runId, succeeded.images[0].imageId)).dataUrl); }
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    await action('正在导入素材', async () => {
      let current = project;
      if (!current) current = await workflowCall<WorkflowProject>('create-project', { projectName: name, brandName: name, industry, description, apiProfileId: settings?.analysisProfileId });
      setProject(current);
      for (const file of Array.from(files)) {
        if (!/\.(png|jpe?g|webp|pdf|zip)$/iu.test(file.name)) continue;
        setProgress(`正在导入 ${file.name}`);
        current = await workflowCall<WorkflowProject>('import-files', current.id, [await filePayload(file)]);
        setProject(current);
      }
      setProjects(await workflowCall<WorkflowProject[]>('list-projects')); setProgress('素材导入完成');
      if (current) {setName(current.projectName);setIndustry(current.industry);}
    });
  }
  async function analyze() {
    if (!project) return;
    await action('正在分析', async () => {
      setStep(1); setProgress('正在整理素材');
      try {
        const result = await workflowCall<{project: WorkflowProject}>('analyze', project.id, true);
        setProject(result.project);setName(result.project.projectName);setIndustry(result.project.industry); setReport(await workflowCall<string>('report', project.id) || ''); setStep(2);
      } finally {setDirectionRefresh(value=>value+1);}
    });
  }
  async function generate() {
    if (!project) return;
    await action('正在生成并校验', async () => {
      const currentDirection=await workflowCall<ProjectDesignDirection>('report',project.id,'project_design_direction');
      if (family==='space' && (directionUnsaved || !designDirection || currentDirection.recordSha256!==designDirection.recordSha256 || !['missing','confirmed'].includes(currentDirection.status))) throw new Error('项目设计方向已变化或尚未确认，请核对并确认后再生图。');
      setImage(''); setRun(null); setResultLabel('');
      const compiled = await workflowCall<{taskContract: {taskId: string}}>('compile', createStandardGenerationInput({projectId:project.id,family,subtype,shot,shotExplicit,ratio,instruction,include,avoid,hasLogo:project.assets.some(a=>a.role==='logo'),directionRecordSha256:currentDirection.recordSha256,styleControls}));
      const result = await workflowCall<{initialRun: WorkflowRun; correctionRun?: WorkflowRun; firstImage?: {runId: string; imageId: string}; terminalStatus: string; automaticRetryCount: number}>('generate', { projectId: project.id, taskId: compiled.taskContract.taskId });
      const selected = result.correctionRun?.status === 'succeeded' ? result.correctionRun : result.initialRun;
      setRun(selected); setResultLabel(`${result.terminalStatus === 'passed' ? '校验通过' : result.terminalStatus === 'failed' ? '未通过校验，请检查结果' : '生成完成，请确认结果'}${result.automaticRetryCount ? ' · 已执行一次纠偏' : ''}`);
      const generated = selected.images[0];
      const target = generated ? {runId: selected.runId, imageId: generated.imageId} : result.firstImage;
      if (target) setImage((await workflowCall<{dataUrl: string}>('image', target.runId, target.imageId)).dataUrl);
    });
  }
  const available = options[family];
  const logo=project?.assets.find(asset=>asset.role==='logo');
  async function compositeLogo() {
    const target=run?.images[0];
    if (!project || !run || !target || !logo) return;
    await action('正在合成原始 Logo',async()=>{
      const source=await workflowCall<{width:number;height:number}>('logo-source',project.id,logo.id);
      const result=await workflowCall<{dataUrl:string}>('post-composite-logo',{projectId:project.id,runId:run.runId,imageId:target.imageId,logoAssetId:logo.id,confirmedByUser:true,sourceCrop:{left:0,top:0,width:source.width,height:source.height},placement:{x:logoPlacement.x/100,y:logoPlacement.y/100,width:logoPlacement.width/100},removeBackground:{enabled:removeLogoBackground}});
      setImage(result.dataUrl);setResultLabel('原始 Logo 后期合成完成');
    });
  }
  const metadataUnsaved = Boolean(project && (name!==project.projectName || industry!==project.industry));
  const canGenerate = !metadataUnsaved && project?.status === 'completed' && project.visualContextVNextStatus === 'ready';
  const html = DOMPurify.sanitize(marked.parse(report, { async: false }));

  return <div className="visual-workflow">
    <header className="visual-workflow__header">
      <button type="button" onClick={onBack} disabled={Boolean(busy)}>← 返回首页</button>
      <div><h1>视觉分析与生图</h1><p>导入素材 → 视觉分析 → 查看报告 → 智能生图</p></div>
      <button type="button" onClick={() => setShowSettings(!showSettings)} disabled={Boolean(busy)}>独立模型设置</button>
    </header>
    {error && <div className="visual-workflow__error" role="alert">{error}</div>}
    {busy && <div className="visual-workflow__progress" role="status">{busy}{progress && step < 3 ? ` · ${progress}` : ''}</div>}
    {showSettings && <section className="visual-workflow__settings">
      <h2>此功能专用的模型配置</h2><p>修改这里的设置只影响视觉分析与生图。复制已有配置后，两边分别保存。</p>
      {!settings?.profiles.length && <button type="button" disabled={Boolean(busy)} onClick={() => void action('正在复制模型配置', async () => { setSettings(await workflowCall<WorkflowSettings>('import-configuration')); })}>一次性复制已有模型配置</button>}
      <div className="visual-workflow__fields">{(['analysis', 'image_generation'] as const).map((type) => <label key={type}>{type === 'analysis' ? '分析模型' : '生图模型'}<select value={(type === 'analysis' ? settings?.analysisProfileId : settings?.imageProfileId) || ''} disabled={Boolean(busy)} onChange={event => void action('正在保存设置', async () => { setSettings(await workflowCall<WorkflowSettings>('select-profiles', { [type === 'analysis' ? 'analysisProfileId' : 'imageProfileId']: event.target.value })); })}><option value="">请选择</option>{settings?.profiles.filter(p => p.modelType === type).map(p => <option key={p.id} value={p.id}>{p.name} · {p.modelId}</option>)}</select></label>)}</div>
      <details><summary>添加专用模型配置</summary><form className="visual-workflow__fields" onSubmit={event => { event.preventDefault(); void action('正在保存模型', async () => { setSettings(await workflowCall<WorkflowSettings>('save-profile', profile)); setProfile({...profile, apiKey: ''}); }); }}>
        <label>用途<select value={profile.modelType} onChange={event => setProfile({...profile, modelType: event.target.value, protocol: event.target.value === 'analysis' ? 'openai-chat-multimodal' : 'seedream-image'})}><option value="analysis">视觉分析</option><option value="image_generation">图片生成</option></select></label>
        {(['name', 'provider', 'modelId', 'baseUrl', 'apiKey'] as const).map(field => <label key={field}>{{name:'名称', provider:'Provider', modelId:'Model ID', baseUrl:'Base URL', apiKey:'API Key'}[field]}<input required={field !== 'name'} type={field === 'apiKey' ? 'password' : 'text'} value={profile[field]} onChange={event => setProfile({...profile, [field]: event.target.value})} /></label>)}
        <label>协议<select value={profile.protocol} onChange={event => setProfile({...profile, protocol: event.target.value})}>{(profile.modelType === 'analysis' ? ['openai-chat-multimodal'] : ['seedream-image', 'openai-image-generation', 'google-gemini-image']).map(protocol => <option key={protocol}>{protocol}</option>)}</select></label><button disabled={Boolean(busy)}>保存专用配置</button>
      </form></details>
    </section>}
    {!settings?.analysisProfileId && !showSettings && <div className="visual-workflow__progress">请先<button onClick={() => setShowSettings(true)}>配置此功能的分析与生图模型</button></div>}
    <div className="visual-workflow__layout">
      <aside className="visual-workflow__projects"><button disabled={Boolean(busy)} onClick={() => {setProject(null);setName('');setIndustry('');setDescription(''); setStep(0); setImage(''); setReport('');}}>＋ 新建视觉项目</button>
        {legacyId && !projects.some(p => p.id === legacyId) && <button disabled={Boolean(busy)} onClick={() => void action('正在迁入项目副本', async () => { await open(await workflowCall<WorkflowProject>('import-project', legacyId)); })}>迁入并打开原项目</button>}
        <p>独立项目</p>{projects.map(item => <button key={item.id} disabled={Boolean(busy)} className={project?.id === item.id ? 'is-selected' : ''} onClick={() => void action('正在打开项目', () => open(item))}><strong>{item.projectName}</strong><small>{statusLabels[item.status] || item.status} · {item.assetCount} 个素材</small></button>)}
        {!projects.length && <p>创建项目或从首页选择已有项目，一次性迁入其素材和分析结果。</p>}
      </aside>
      <main className="visual-workflow__main">
        <nav className="visual-workflow__steps" aria-label="视觉工作流步骤">{STEPS.map((label, index) => <button key={label} aria-current={step === index ? 'step' : undefined} disabled={Boolean(busy) || index > 0 && !project || index > 1 && !project?.lastReportFilename || index === 3 && !canGenerate} onClick={() => setStep(index)}>{index + 1}. {label}</button>)}</nav>
        <h2>{project?.projectName || '新建视觉项目'}</h2>
        {project && <ProjectDesignDirectionPanel key={`${project.id}:${project.status}:${directionRefresh}`} projectId={project.id} disabled={Boolean(busy)} onState={(value,unsaved)=>{setDesignDirection(value);setDirectionUnsaved(unsaved);}} />}
        {step === 0 && <section><div className="visual-workflow__fields">
          <label>项目 / 品牌名称<input value={name} maxLength={200} disabled={Boolean(busy) || project?.status==='running'} onChange={event => setName(event.target.value)} /></label>
          <label>所属行业<input value={industry} maxLength={200} disabled={Boolean(busy) || project?.status==='running'} onChange={event => setIndustry(event.target.value)} /></label>
          {!project && <label>项目说明<textarea value={description} onChange={event => setDescription(event.target.value)} /></label>}
        </div>{project && <><button type="button" disabled={Boolean(busy) || project.status==='running' || !metadataUnsaved || !name.trim() || !industry.trim()} onClick={()=>void action('正在保存项目资料',async()=>{const saved=await workflowCall<WorkflowProject>('update-project',project.id,{projectName:name,industry,expectedUpdatedAt:project.updatedAt});setProject(saved);setName(saved.projectName);setIndustry(saved.industry);setDirectionRefresh(value=>value+1);})}>保存项目资料</button><p>{metadataUnsaved?'有未保存的项目资料。修改名称或行业后，历史报告保留，需重新分析后才能生图，并重新核对设计方向。':'项目资料已保存。'}</p></>}
        <div className="visual-workflow__upload"><label>选择图片、PDF 或 ZIP<input type="file" multiple accept=".png,.jpg,.jpeg,.webp,.pdf,.zip" disabled={Boolean(busy) || metadataUnsaved} onChange={event => void upload(event.target.files)} /></label><label>导入文件夹<input type="file" multiple {...{webkitdirectory: ''}} disabled={Boolean(busy) || metadataUnsaved} onChange={event => void upload(event.target.files)} /></label></div>
          {project && <><p>已导入 {project.assetCount} 个素材。原始 Logo 会保持锁定。</p><label>原始 Logo<select value={project.assets.find(a => a.role === 'logo')?.id || ''} disabled={Boolean(busy)} onChange={event => void action('正在设置原始 Logo', async () => { setProject(await workflowCall<WorkflowProject>('select-logo', project.id, event.target.value)); })}><option value="">选择已导入的 Logo 图片</option>{project.assets.filter(a => a.mimeType.startsWith('image/')).map(asset => <option key={asset.id} value={asset.id}>{asset.originalName}</option>)}</select></label><ul className="visual-workflow__asset-list">{project.assets.map(asset => <li key={asset.id}>{asset.originalName}{asset.role === 'logo' ? ' · 原始 Logo' : ''}</li>)}</ul><button disabled={Boolean(busy) || !project.assetCount || metadataUnsaved || !settings?.analysisProfileId} onClick={() => void analyze()}>开始视觉分析</button></>}
        </section>}
        {step === 1 && <section><p>{progress || '使用本项目的素材分析品牌视觉与设计方向。'}</p>{project?.lastError && <p role="alert">{project.lastError}</p>}<button disabled={Boolean(busy) || metadataUnsaved || !settings?.analysisProfileId} onClick={() => void analyze()}>重新分析</button>{busy && project && <button onClick={() => void workflowCall('cancel-analysis', project.id)}>取消分析</button>}</section>}
        {step === 2 && <section><button disabled={Boolean(busy) || !canGenerate} onClick={() => setStep(3)}>进入智能生图 →</button><article className="visual-workflow__report" dangerouslySetInnerHTML={{__html: html}} /></section>}
        {step === 3 && <section className="visual-workflow__generation"><form onSubmit={event => {event.preventDefault(); void generate();}}>
          <label>成果类型<select value={family} onChange={event => { const next = event.target.value; const defaults = DEFAULTS[next]; setFamily(next); setSubtype(defaults?.[0] || ''); setShot(defaults?.[1] || ''); setShotExplicit(false); }}>{Object.entries(FAMILY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label>本轮要求<textarea required value={instruction} onChange={event => setInstruction(event.target.value)} /></label>
          <label>画面比例<select value={ratio} onChange={event => setRatio(event.target.value)}>{['1:1','4:3','3:4','16:9','9:16'].map(item => <option key={item}>{item}</option>)}</select></label>
          <label>子类型<select value={subtype} onChange={event => setSubtype(event.target.value)}>{available?.subtypes.map(item => <option key={item} value={item}>{LABELS[item] || item}</option>)}</select></label>
          <label>镜头 / 构图<select value={shot} onChange={event => {setShot(event.target.value); setShotExplicit(true);}}>{available?.shots.map(item => <option key={item} value={item}>{LABELS[item] || item}</option>)}</select></label>
          <label>必须包含（每行一项）<textarea value={include} onChange={event => setInclude(event.target.value)} /></label><label>必须避免（每行一项）<textarea value={avoid} onChange={event => setAvoid(event.target.value)} /></label>
          <details className="visual-workflow__style"><summary>风格约束（可选，默认跟随分析）</summary><div className="visual-workflow__fields">{STYLE_FIELDS.map(field => <label key={field.key}>{field.label}<select value={styleControls[field.key]} onChange={event => setStyleControls({ ...styleControls, [field.key]: event.target.value })}>{field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}</div><p>“不出现数字”是当前默认价格策略；选择“仅真实菜单”前请先确认菜单内容。</p></details>
          <p>Logo：{project?.assets.some(a => a.role === 'logo') ? '预留区域，原始 Logo 后期合成' : '预留干净区域'}</p>
          <button disabled={Boolean(busy) || !canGenerate || !settings?.imageProfileId || family==='space' && (directionUnsaved || !designDirection || !['missing','confirmed'].includes(designDirection.status))}>智能生成</button>
          {busy && run?.status === 'running' && <button type="button" onClick={() => void workflowCall('cancel-generation', run.runId)}>取消生成</button>}
        </form><div className="visual-workflow__preview">{image ? <><img src={image} alt="当前项目生成结果" /><p>{resultLabel}</p><a href={image} download={`${project?.projectName || '视觉结果'}.png`}>下载图片</a>{logo && run?.images[0] && <details><summary>原始 Logo 后期合成</summary><p>设置 Logo 在图片中的位置，宽度按原比例缩放。</p><div className="visual-workflow__fields">{(['x','y','width'] as const).map(field=><label key={field}>{{x:'水平位置（%）',y:'垂直位置（%）',width:'宽度（%）'}[field]}<input type="number" min={field==='width'?1:0} max={100} value={logoPlacement[field]} onChange={event=>setLogoPlacement({...logoPlacement,[field]:Number(event.target.value)})}/></label>)}</div><label><input type="checkbox" checked={removeLogoBackground} onChange={event=>setRemoveLogoBackground(event.target.checked)}/>移除 Logo 纯色背景</label><button type="button" disabled={Boolean(busy)} onClick={()=>void compositeLogo()}>确认并合成原始 Logo</button></details>}</> : <p>{busy || '生成的图片将在这里展示'}</p>}</div></section>}
      </main>
    </div>
  </div>;
}
