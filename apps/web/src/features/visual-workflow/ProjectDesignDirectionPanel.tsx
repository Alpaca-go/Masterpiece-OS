import { useEffect, useState } from 'react';
import { workflowCall, type ProjectDesignDirection } from './api';

const labels = {
  spatialConcept:'空间体验与设计目标', structureLanguage:'建筑结构与空间组织', materialLanguage:'材料与光学表现',
  lightingLanguage:'自然光与照明', colorPolicy:'空间配色与品牌色的职责', functionalProgram:'必须保留的商业功能与通行关系', mustAvoid:'必须避免的设计表现'
};
const statuses = {missing:'未设置，当前使用分析建议',draft:'草稿，尚未确认生效',confirmed:'已确认，将用于标准空间生图',needs_reconfirmation:'需要重新确认，当前禁止按旧方向生图'};
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
    setValue(next);setFields(next.fields);setSource(next.source?.statement || '');setDirty(false);setConfirmed(false);onState(next,false);
  }
  useEffect(()=>{
    let active=true;
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
    <p role="status">{value?statuses[value.status]:'正在读取确认状态'}{dirty?' · 有未保存修改':''}</p>
    <p>这里记录用户的项目设计决策，不改写原始品牌资料。标准生图只发送文字；审美校准图片不会自动作为生图参考。</p>
    {value?.status==='needs_reconfirmation' && <p role="alert">重新分析、素材或项目资料变化后，原方向仍保留。请核对当前分析与方向，再确认生效。</p>}
    {error && <p role="alert">{error}</p>}
    {value && fields && <details><summary>查看、编辑并确认设计方向</summary>
      <fieldset disabled={disabled || saving}>
        <label>决策来源与确认依据<textarea value={source} onChange={event=>{setSource(event.target.value);setDirty(true);setConfirmed(false);onState(value,true);}} placeholder="例如：用户确认的设计要求；参考作品仅用于离线审美校准" /></label>
        {Object.entries(labels).map(([key,label])=><label key={key}>{label}<textarea value={fields[key as keyof typeof fields]} onChange={event=>{setFields({...fields,[key]:event.target.value});setDirty(true);setConfirmed(false);onState(value,true);}} /></label>)}
        <button type="button" disabled={!source.trim()} onClick={()=>void save('save_draft')}>保存设计方向草稿</button>
        {value.status!=='missing' && <><label><input type="checkbox" checked={confirmed} disabled={dirty} onChange={event=>setConfirmed(event.target.checked)} />我已核对当前项目分析，确认此方向用于空间生图</label>
          <button type="button" disabled={dirty || !confirmed} onClick={()=>void save('confirm')}>确认设计方向生效</button></>}
        {value.confirmedAt && <p>最近确认：{value.confirmedAt}</p>}
      </fieldset>
    </details>}
  </section>;
}
