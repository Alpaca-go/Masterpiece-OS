import { useRef, useState } from 'react';
import type { BrowserVisualFileEntry } from '@masterpiece/runtime-core/application-contracts.ts';
import { cleanError, formatBytes } from '../utils';

export interface VisualAssetUploadItem {
  id: string;
  name: string;
  extension: string;
  bytes: number;
  thumbnailDataUrl?: string;
}

interface Props {
  role: 'current_project' | 'reference';
  visualSchemeDropZone?: boolean;
  items: VisualAssetUploadItem[];
  busy?: boolean;
  notice?: string;
  onAddPaths(paths: string[]): void | Promise<void>;
  onAddBrowserFiles?(files: BrowserVisualFileEntry[]): void | Promise<void>;
  onChooseFiles(): Promise<string[]>;
  onChooseFolder(): Promise<string[]>;
  onRemove?(id: string): void | Promise<void>;
  onClear?(): void | Promise<void>;
}

export function VisualAssetUploader({
  role,
  visualSchemeDropZone = false,
  items,
  busy = false,
  notice,
  onAddPaths,
  onAddBrowserFiles,
  onChooseFiles,
  onChooseFolder,
  onRemove,
  onClear
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const [pickerError, setPickerError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const visible = showAll ? items : items.slice(0, 8);
  const reference = role === 'reference';
  const visualScheme = reference || visualSchemeDropZone;

  function openBrowserPicker(kind: 'files' | 'folder') {
    const input = kind === 'folder' ? folderInputRef.current : fileInputRef.current;
    if (kind === 'folder') input?.setAttribute('webkitdirectory', '');
    input?.click();
  }

  async function chooseAndAdd(chooser: () => Promise<string[]>, kind: 'files' | 'folder') {
    if (busy) return;
    setPickerError('');
    try {
      const paths = await chooser();
      if (paths.length) await onAddPaths(paths);
      else openBrowserPicker(kind);
    } catch (reason) {
      openBrowserPicker(kind);
      if (!(kind === 'folder' ? folderInputRef.current : fileInputRef.current)) {
        setPickerError(cleanError(reason));
      }
    }
  }

  async function addBrowserFiles(files: FileList | null, input: HTMLInputElement | null) {
    if (!files?.length || !onAddBrowserFiles) return;
    setPickerError('');
    try {
      const entries = await Promise.all(Array.from(files).map(async (file): Promise<BrowserVisualFileEntry> => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = '';
        for (let index = 0; index < bytes.length; index += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
        }
        return { name: file.name, mime: file.type, size: bytes.length, content: btoa(binary) };
      }));
      await onAddBrowserFiles(entries);
    } catch (reason) {
      setPickerError(cleanError(reason));
    } finally {
      if (input) input.value = '';
    }
  }

  return <div className="visual-asset-uploader">
    <div className={`drop-zone intake-drop-zone ${busy ? 'busy' : ''}`} onDragOver={(event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }} onDrop={(event) => {
      event.preventDefault();
      const paths = Array.from(event.dataTransfer.files)
        .map((file) => window.masterpiece.files.getPathForFile(file))
        .filter(Boolean);
      if (paths.length) void onAddPaths(paths);
      else void addBrowserFiles(event.dataTransfer.files, fileInputRef.current);
    }}>
      <button
        className="intake-drop-zone__picker"
        type="button"
        disabled={busy}
        aria-label="选择要上传的视觉素材"
        onClick={() => void chooseAndAdd(onChooseFiles, 'files')}
      >
        <span className="upload-orbit" aria-hidden>↥</span>
        <strong>{busy ? '正在读取、过滤与去重…' : visualScheme ? '拖入图片或文件夹，或点击选择' : '将 ZIP、图片、PDF 或文件夹拖到这里，或点击选择'}</strong>
        <p>{visualScheme
          ? '建议上传 4–8 张能够代表整套视觉系统的关键图片。支持 JPG、JPEG、PNG、WebP、PDF、ZIP。'
          : '支持 ZIP、JPG、JPEG、PNG、WEBP、PDF，可多选'}</p>
      </button>
      <div className="button-row">
        <button className="button ghost" type="button" disabled={busy} onClick={() => void chooseAndAdd(onChooseFolder, 'folder')}>导入整个文件夹</button>
      </div>
    </div>

    <input ref={fileInputRef} hidden type="file" multiple accept=".zip,.jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => void addBrowserFiles(event.currentTarget.files, event.currentTarget)} />
    <input ref={folderInputRef} hidden type="file" multiple accept=".zip,.jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => void addBrowserFiles(event.currentTarget.files, event.currentTarget)} />

    {pickerError && <div className="notice error" role="alert">无法打开文件选择器：{pickerError}</div>}
    {notice && <div className="notice ok">{notice}</div>}
    {items.length > 0 && <div className="visual-uploader-selection">
      <div className="intake-heading">
        <div><small>已选择</small><h2>{items.length} 个文件</h2>
          {visualScheme && items.length < 4 && <p className="inline-warning">当前视觉图较少，跨图规律判断可能不够稳定。</p>}
          {visualScheme && items.length > 12 && <p className="inline-warning">视觉图较多，分析时间和 Token 消耗可能上升。</p>}
        </div>
        <div className="button-row">
          {items.length > 8 && <button className="button text-button" type="button" onClick={() => setShowAll((value) => !value)}>{showAll ? '收起' : `查看全部（仅展示前 8 个）`}</button>}
          {onClear && <button className="button danger" type="button" disabled={busy} onClick={() => void onClear()}>清空</button>}
        </div>
      </div>
      <div className="intake-thumbnails">
        {visible.map((item) => <div className="asset-card removable" key={item.id}>
          {onRemove && <button className="asset-remove" disabled={busy} title={`删除 ${item.name}`} aria-label={`删除 ${item.name}`} onClick={() => void onRemove(item.id)}>×</button>}
          {item.thumbnailDataUrl ? <img src={item.thumbnailDataUrl} alt="" /> : <div className="file-placeholder">{item.extension.replace('.', '').toUpperCase()}</div>}
          <strong title={item.name}>{item.name}</strong>
          <small>{formatBytes(item.bytes)}</small>
        </div>)}
      </div>
    </div>}
  </div>;
}
