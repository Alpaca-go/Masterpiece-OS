import { useEffect, useRef, useState } from 'react';
import { filePayload, workflowCall } from './api';

interface AtlasImage { id: string; file: string; originalName: string; mimeType: string; sizeBytes: number }
interface AtlasEntry {
  schemaVersion: string; slug: string; title: string; styleScope: string; brandCategory: string;
  site: string; likes: string; rejected: string; landed: string; createdAt: string; updatedAt: string;
  images: AtlasImage[]; imageCount?: number;
}
const EMPTY = {
  slug: '', title: '', styleScope: '', brandCategory: '', site: '',
  likes: '', rejected: '', landed: ''
};
type Draft = typeof EMPTY;

export function ReferenceAtlasPanel({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<AtlasEntry[]>([]);
  const [selected, setSelected] = useState<AtlasEntry | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [exportPath, setExportPath] = useState('');
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function load(selectSlug?: string) {
    const list = await workflowCall<AtlasEntry[]>('atlas-list');
    setEntries(list);
    const next = selectSlug ? list.find((item) => item.slug === selectSlug) : selected ? list.find((item) => item.slug === selected.slug) : null;
    setSelected(next || null);
    if (!next) setThumbs({});
  }

  useEffect(() => { void run('正在读取参考图集', async () => { await load(); setMessage(''); }); }, []);
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const image of selected.images) {
        try {
          const result = await workflowCall<{ dataUrl: string }>('atlas-image', selected.slug, image.id);
          next[image.id] = result.dataUrl;
        } catch { /* skip broken image */ }
      }
      if (!cancelled) setThumbs(next);
    })();
    return () => { cancelled = true; };
  }, [selected?.slug, selected?.updatedAt]);

  async function run(label: string, task: () => Promise<void>) {
    setBusy(true); setMessage(label);
    try { await task(); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  async function create() {
    await run('正在创建条目', async () => {
      const created = await workflowCall<AtlasEntry>('atlas-create', draft);
      setDraft(EMPTY); setCreating(false);
      await load(created.slug);
      setMessage('已创建，可以直接拖拽图片');
    });
  }

  async function upload(files: FileList | File[]) {
    if (!selected || !files.length) return;
    const images = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (!images.length) { setMessage('只支持图片文件'); return; }
    await run('正在上传图片', async () => {
      const payload = await Promise.all(images.map(async (file) => ({ ...(await filePayload(file)), mimeType: file.type })));
      await workflowCall('atlas-upload', selected.slug, payload);
      await load(selected.slug);
      setMessage(`已上传 ${images.length} 张`);
    });
  }

  async function save(fields: Partial<Draft>) {
    if (!selected) return;
    await run('正在保存备注', async () => {
      await workflowCall('atlas-update', selected.slug, fields);
      await load(selected.slug);
      setMessage('已保存');
    });
  }

  async function remove() {
    if (!selected || !window.confirm(`删除「${selected.title || selected.slug}」？图片会一起删除。`)) return;
    await run('正在删除', async () => {
      await workflowCall('atlas-delete', selected.slug);
      setSelected(null); setThumbs({}); await load();
      setMessage('已删除');
    });
  }

  async function exportEntry() {
    if (!selected) return;
    await run('正在导出', async () => {
      const result = await workflowCall<{ path: string }>('atlas-export', selected.slug);
      setExportPath(result.path);
      setMessage('已导出，复制到 docs/knowledge/reference-atlas/ 即可入库');
    });
  }

  return <section>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div><h2>参考图集</h2><p>认可方案的风格样本。只描述“长什么样”，不当作验收案例；导出后再提交到仓库。</p></div>
      <button type="button" disabled={busy} onClick={onClose}>返回工作流</button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
      <aside>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>条目（{entries.length}）</strong>
          <button type="button" disabled={busy} onClick={() => { setCreating(true); setDraft(EMPTY); }}>新建</button>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0' }}>
          {entries.map((entry) => <li key={entry.slug} style={{ marginBottom: 4 }}>
            <button type="button" disabled={busy} aria-current={selected?.slug === entry.slug ? 'true' : undefined}
              onClick={() => { setCreating(false); setExportPath(''); setSelected(entry); }}>
              {entry.title || entry.slug}<br /><small>{entry.styleScope || '未填风格'} · {entry.imageCount ?? entry.images.length} 张</small>
            </button>
          </li>)}
          {!entries.length && <li><small>还没有条目。</small></li>}
        </ul>
      </aside>
      <main>
        <p role="status">{busy ? message : message || '拖拽图片到下方区域即可上传'}</p>
        {creating && <div>
          <h3>新建条目</h3>
          <div className="visual-workflow__fields">
            {([['slug', 'slug（小写字母/数字/-）'], ['title', '标题'], ['styleScope', '风格作用域'], ['brandCategory', '品牌 / 品类'], ['site', '场地']] as Array<[keyof Draft, string]>).map(([key, label]) => <label key={key}>{label}<input value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>)}
          </div>
          {(['likes', 'rejected', 'landed'] as Array<keyof Draft>).map((key) => <label key={key} style={{ display: 'block', marginTop: 8 }}>{key === 'likes' ? '喜欢的三点' : key === 'rejected' ? '当时否掉了什么' : '落地与修改'}<textarea rows={3} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>)}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" disabled={busy || !draft.slug.trim()} onClick={() => void create()}>创建</button>
            <button type="button" disabled={busy} onClick={() => setCreating(false)}>取消</button>
          </div>
        </div>}
        {!creating && selected && <div>
          <h3>{selected.title || selected.slug}</h3>
          <p><small>{selected.slug} · {selected.styleScope || '未填风格'} · 更新于 {selected.updatedAt}</small></p>
          {(['likes', 'rejected', 'landed'] as Array<keyof Draft>).map((key) => <label key={key} style={{ display: 'block', marginTop: 8 }}>{key === 'likes' ? '喜欢的三点' : key === 'rejected' ? '当时否掉了什么' : '落地与修改'}<textarea rows={3} defaultValue={selected[key]} onBlur={(event) => { if (event.target.value !== selected[key]) void save({ [key]: event.target.value } as Partial<Draft>); }} /></label>)}
          <div
            onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => { event.preventDefault(); setDragActive(false); void upload(event.dataTransfer.files); }}
            style={{ border: `2px dashed ${dragActive ? '#c56b2c' : '#9a9a9a'}`, borderRadius: 8, padding: 18, textAlign: 'center', marginTop: 12 }}
          >
            <p>把图片拖到这里，或</p>
            <button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>选择图片</button>
            <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(event) => { if (event.target.files) void upload(event.target.files); event.target.value = ''; }} />
          </div>
          {!!selected.images.length && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginTop: 12 }}>
            {selected.images.map((image) => <figure key={image.id} style={{ margin: 0 }}>
              {thumbs[image.id] ? <img src={thumbs[image.id]} alt={image.originalName} style={{ width: '100%', borderRadius: 6 }} /> : <div style={{ height: 90, background: '#eee', borderRadius: 6 }} />}
              <figcaption><small>{image.originalName}</small></figcaption>
            </figure>)}
          </div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" disabled={busy} onClick={() => void exportEntry()}>导出（notes.md + 图片）</button>
            <button type="button" disabled={busy} onClick={() => void remove()}>删除条目</button>
          </div>
          {exportPath && <p><small>导出到：<code>{exportPath}</code><br />复制到 <code>docs/knowledge/reference-atlas/{selected.slug}/</code>，再提交。</small></p>}
        </div>}
        {!creating && !selected && <p>左侧选择条目，或新建一个。</p>}
      </main>
    </div>
  </section>;
}
