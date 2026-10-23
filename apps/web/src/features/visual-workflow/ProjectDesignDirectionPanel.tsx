import { useEffect, useState } from 'react';
import { workflowCall, projectDesignDirectionStatusText, type ProjectDesignDirection } from './api';

const labels = {
  spatialConcept:'空间体验与设计目标', structureLanguage:'建筑结构与空间组织', artisticFocus:'主艺术系统与空间焦点',
  lightingLanguage:'自然光与照明',lightingContrast:'明暗与对比',lightingInteraction:'光线与材料的相互作用',lightingAvoid:'照明禁用表现',
  colorAvoid:'整体配色禁用表现',functionalProgram:'功能节点（每行一个区域）',functionalNetwork:'功能网络与通行连接',
  functionalRelationships:'跨区域运营与隐私关系',visibleRequirements:'画面必须可见的功能设施',compositionRequirements:'构图、主次与画面关系',mustAvoid:'必须避免的设计表现'
};
function missingLabel(field:string) {
  const entry=/^(colorEntries|materialEntries)\[(\d+)\]\.(\w+)$/.exec(field);
  if (entry) {
    const names:Record<string,string>={name:'颜色名称',role:'视觉职责说明',surfaceApplicability:'作用表面与边界',spatialUsage:'空间作用范围',material:'材质名称',behavior:'光学表现',brandRole:'材料的空间职责',forbidden:'材料禁用表现'};
    return `${entry[1]==='colorEntries'?'颜色':'材料'} ${Number(entry[2])+1} · ${names[entry[3] || ''] || '待明确内容'}`;
  }
  return labels[field as keyof typeof labels] || ({colorEntries:'颜色职责与作用范围',materialEntries:'材料与光学表现',materialLanguage:'材料概述',colorPolicy:'配色概述'} as Record<string,string>)[field] || '待明确内容';
}
export function ProjectDesignDirectionPanel({projectId,disabled,onState}: {
  projectId:string; disabled:boolean; onState:(value:ProjectDesignDirection | null,unsaved:boolean)=>void;
}) {
  const [value,setValue]=useState<ProjectDesignDirection | null>(null);
  const [source,setSource]=useState('');
  const [fields,setFields]=useState<ProjectDesignDirection['fields'] | null>(null);
  const [dirty,setDirty]=useState(false);
  const [confirmed,setConfirmed]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  function accept(next:ProjectDesignDirection) {
    if (next.projectId!==projectId || next.analysisSuggestion && (next.analysisSuggestion.projectId!==projectId || next.analysisSuggestion.analysisFingerprint!==next.analysisFingerprint)) throw new Error('设计方向建议与当前项目分析不匹配');
    setValue(next);setFields(next.status==='missing' ? next.analysisSuggestion?.fields || next.fields : next.fields);
    setSource(next.source?.statement || (next.status==='missing' && next.analysisSuggestion?.designProposal ? '当前项目分析生成的模型设计提案；原始事实、设计假设及待确认条件分别保留，需人工核对后确认。' : ''));
    setDirty(false);setConfirmed(false);onState(next,false);
  }
  function edit(next:ProjectDesignDirection['fields']) {
    setFields(next);setDirty(true);setConfirmed(false);onState(value,true);
  }
  useEffect(()=>{
    let active=true;
    setValue(null);setFields(null);setSource('');setError('');setDirty(false);setConfirmed(false);
    onState(null,false);
    void workflowCall<ProjectDesignDirection>('report',projectId,'project_design_direction').then(next=>{if(active)accept(next);}).catch(reason=>{if(active)setError(String(reason.message));});
    return ()=>{active=false;};
    // The parent remounts this panel when the project or analysis result changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[projectId]);
  async function save(action:'save_draft' | 'confirm') {
    if (!value || !fields) return;
    setSaving(true);setError('');
    try {
      accept(await workflowCall<ProjectDesignDirection>('import-files',projectId,{
        purpose:'project_design_direction',action,expectedRecordSha256:value.recordSha256,
        ...(action==='save_draft'?{fields,sourceStatement:source}:{confirmedByUser:confirmed})
      }));
    } catch(reason) {setError(reason instanceof Error?reason.message:String(reason));}
    finally {setSaving(false);}
  }
  return <section className="visual-workflow__settings" aria-label="项目设计方向">
    <h3>项目设计方向</h3>
    <p role="status">{value?projectDesignDirectionStatusText(value):'正在读取确认状态'}{dirty?' · 有未保存修改':''}</p>
    <p>这里记录用户的项目设计决策，不改写原始品牌资料。标准生图只发送文字；审美校准图片不会自动作为生图参考。</p>
    {value?.status==='needs_reconfirmation' && <p role="alert">重新分析、素材或项目资料变化后，原方向仍保留。请核对当前分析与方向，再确认生效。</p>}
    {error && <p role="alert">{error}</p>}
    {value?.status==='missing' && value.analysisSuggestion?.designProposal && <div>
      <p>模型已自动补全设计提案。以下是推导依据和设计假设，不代表原始资料或已确认事实；请核对后保存并确认。</p>
      {(['basis','assumptions','unresolvedQuestions'] as const).map(key=><details key={key} open={key==='unresolvedQuestions'}><summary>{{basis:'设计推导依据',assumptions:'方案成立的假设',unresolvedQuestions:'仍需确认的条件'}[key]}</summary><ul>{value.analysisSuggestion?.designProposal?.[key].map((item,index)=><li key={index}>{item}</li>)}</ul></details>)}
    </div>}
    {value?.validationIssues?.length ? <div role="alert"><p>以下关系尚待补充确认；当前不会用于生图：</p><ul>{value.validationIssues.map(issue=><li key={issue}>{issue}</li>)}</ul></div> : null}
    {value?.status==='missing' && <p>{!value.analysisSuggestion || value.analysisSuggestion.availability==='missing_packet'
      ? '尚无分析结果。完成视觉分析后，这里会显示有来源的建议；也可手动填写并保存草稿。'
      : value.analysisSuggestion.availability==='insufficient_evidence'
        ? '当前分析证据不足，仅预填已有明确来源的内容，其余保持空白待补充。自动填充不会保存草稿或确认方向。'
        : '以下内容来自当前项目分析，自动填充不会保存草稿或确认方向。请补充缺项，并填写人工核对依据后自行保存。'}</p>}
    {value?.status==='missing' && Boolean(value.analysisSuggestion?.missingFields.length) && <details><summary>待补充：分析中缺少明确来源的字段</summary><ul>{value.analysisSuggestion?.missingFields.map(item=><li key={item.field}>{missingLabel(item.field)}：待补充{item.reason==='explicit_spatial_scope_required'?'（需明确空间作用范围，不由配色角色推断）':item.reason==='explicit_material_role_required'?'（需明确材料的空间职责）':''}</li>)}</ul></details>}
    {value && fields && <details open={value.status==='missing' || undefined}><summary>查看、编辑并确认设计方向</summary>
      <fieldset disabled={disabled || saving}>
        <label>决策来源与确认依据<textarea value={source} onChange={event=>{setSource(event.target.value);setDirty(true);setConfirmed(false);onState(value,true);}} placeholder="例如：用户确认的设计要求；参考作品仅用于离线审美校准" /></label>
        {Object.entries(labels).map(([key,label])=><label key={key}>{label}<textarea data-design-field={key} placeholder={value.status==='missing' && !fields[key as keyof typeof labels]?'待补充：分析中暂无明确来源':undefined} value={fields[key as keyof typeof labels]} onChange={event=>edit({...fields,[key]:event.target.value})} /></label>)}
        <h4>颜色职责与作用范围</h4><p>主色排序不代表铺满空间；每种颜色请明确实际表面和范围。</p>
        {fields.colorEntries.map((entry,index)=><fieldset key={index} data-design-color={index}><legend>颜色 {index+1}</legend><div className="visual-workflow__fields">
          <label>颜色名称<input value={entry.name} data-color-field="name" onChange={event=>edit({...fields,colorEntries:fields.colorEntries.map((item,i)=>i===index?{...item,name:event.target.value}:item)})} /></label>
          <label>配色角色<select value={entry.paletteRole} data-color-field="paletteRole" onChange={event=>edit({...fields,colorEntries:fields.colorEntries.map((item,i)=>i===index?{...item,paletteRole:event.target.value}:item)})}><option value="">待明确</option><option value="primary">主色</option><option value="secondary">辅色</option><option value="accent">局部点缀</option></select></label>
          <label>视觉职责说明<input value={entry.role} data-color-field="role" onChange={event=>edit({...fields,colorEntries:fields.colorEntries.map((item,i)=>i===index?{...item,role:event.target.value}:item)})} /></label>
          <label>空间作用范围<select value={entry.spatialUsage} data-color-field="spatialUsage" onChange={event=>edit({...fields,colorEntries:fields.colorEntries.map((item,i)=>i===index?{...item,spatialUsage:event.target.value}:item)})}><option value="">待明确，不授予面积权限</option><option value="dominant_field">明确作为大面积建筑背景</option><option value="secondary_surface">仅指定的辅助表面</option><option value="local_accent">仅局部点缀或局部光学效果</option><option value="soft_furnishing">仅指定软装</option><option value="detail_trim">仅细节收边</option><option value="post_composite_only">仅后期真实标识</option></select></label>
          <label>作用表面与边界<textarea value={entry.surfaceApplicability} data-color-field="surfaceApplicability" onChange={event=>edit({...fields,colorEntries:fields.colorEntries.map((item,i)=>i===index?{...item,surfaceApplicability:event.target.value}:item)})} /></label>
        </div><button type="button" onClick={()=>edit({...fields,colorEntries:fields.colorEntries.filter((_,i)=>i!==index)})}>移除此颜色</button></fieldset>)}
        <button type="button" onClick={()=>edit({...fields,colorEntries:[...fields.colorEntries,{name:'',paletteRole:'',role:'',surfaceApplicability:'',spatialUsage:''}]})}>添加颜色</button>
        <h4>材料与光学表现</h4>
        {fields.materialEntries.map((entry,index)=><fieldset key={index} data-design-material={index}><legend>材料 {index+1}</legend>
          {([['material','材质名称'],['behavior','透射、反射、层叠与光学表现'],['brandRole','材料的空间职责'],['forbidden','材料禁用表现']] as const).map(([key,label])=><label key={key}>{label}<textarea data-material-field={key} value={entry[key]} onChange={event=>edit({...fields,materialEntries:fields.materialEntries.map((item,i)=>i===index?{...item,[key]:event.target.value}:item)})} /></label>)}
          <button type="button" onClick={()=>edit({...fields,materialEntries:fields.materialEntries.filter((_,i)=>i!==index)})}>移除此材料</button>
        </fieldset>)}
        <button type="button" onClick={()=>edit({...fields,materialEntries:[...fields.materialEntries,{material:'',behavior:'',brandRole:'',forbidden:''}]})}>添加材料</button>
        <button type="button" disabled={!source.trim()} onClick={()=>void save('save_draft')}>保存设计方向草稿</button>
        {value.status!=='missing' && <><label><input type="checkbox" checked={confirmed} disabled={dirty} onChange={event=>setConfirmed(event.target.checked)} />我已核对当前项目分析，确认此方向用于空间生图</label>
          <button type="button" disabled={dirty || !confirmed || Boolean(value.validationIssues?.length)} onClick={()=>void save('confirm')}>确认设计方向生效</button></>}
        {value.confirmedAt && <p>最近确认：{value.confirmedAt}</p>}
      </fieldset>
    </details>}
  </section>;
}
