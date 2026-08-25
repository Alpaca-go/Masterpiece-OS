// features/short-chain/OutputGallery.tsx
//
// 路线 A / P3 (架构-3) — Short-Chain 工作台右栏: 已生成产物网格 + A/B 对比。
//
// 当前阶段 (P3 架构-3 骨架):
//   - Mock 历史数据结构 (useMockGallery hook)
//   - 缩略图网格 + 选中态
//   - 多选两张 → A/B 对比模式
//   - A/B 对比 UI (左右栏 + 元信息)
//
// 下一步 (真实数据接入):
//   - useShortChainSession.history 接 OutputGallery.items
//   - 点击缩略图 → PreviewCanvas 显示
//   - 持久化"已确认方向"到 project store

import { useMemo, useState } from 'react';
import { EmptyState, EmptyIllustration } from '../../components/primitives';

export interface OutputItem {
  id: string;
  dataUrl: string;
  thumbnailDataUrl: string;
  createdAt: string;
  family: 'space' | 'packaging' | 'vi' | 'poster';
  subtype: string;
  status: 'pending' | 'passed' | 'failed';
  /** 是否已被确认为有效方向 */
  confirmed?: boolean;
}

export function OutputGallery() {
  const items = useMockGallery();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)).slice(0, 2),
    [items, selectedIds],
  );

  function handleSelect(id: string) {
    if (compareMode) {
      setSelectedIds((current) => {
        if (current.includes(id)) {
          return current.filter((x) => x !== id);
        }
        if (current.length >= 2) {
          // 第三张替换最旧
          return [current[1]!, id];
        }
        return [...current, id];
      });
    } else {
      setSelectedIds([id]);
    }
  }

  function startCompare() {
    if (items.length < 2) return;
    setCompareMode(true);
    setSelectedIds([items[0]!.id, items[1]!.id]);
  }

  function exitCompare() {
    setCompareMode(false);
    setSelectedIds([]);
  }

  // A/B 对比模式
  if (compareMode && selectedItems.length === 2) {
    return (
      <div className="sc-output-gallery sc-output-gallery--compare">
        <div className="sc-output-gallery__compare-header">
          <strong>A/B 对比</strong>
          <button
            type="button"
            className="ui-button ui-button--ghost ui-button--sm"
            onClick={exitCompare}
          >
            ← 返回列表
          </button>
        </div>
        <div className="sc-compare">
          {selectedItems.map((item) => (
            <div key={item.id} className="sc-compare__panel">
              <img src={item.dataUrl} alt={`产物 ${item.id}`} className="sc-compare__image" />
              <div className="sc-compare__meta">
                <span className="sc-compare__meta-key">类型</span>
                <span className="sc-compare__meta-val">{item.family} · {item.subtype}</span>
                <span className="sc-compare__meta-key">时间</span>
                <span className="sc-compare__meta-val">{new Date(item.createdAt).toLocaleString()}</span>
                <span className="sc-compare__meta-key">状态</span>
                <span className={`sc-compare__meta-val sc-compare__status sc-compare__status--${item.status}`}>
                  {item.status === 'passed' ? '通过' : item.status === 'pending' ? '待定' : '失败'}
                  {item.confirmed && ' · 已确认'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 正常模式：缩略图网格
  if (items.length === 0) {
    return (
      <div className="sc-output-gallery">
        <EmptyState
          icon={<EmptyIllustration variant="no-output" />}
          title="已生成产物"
          description="P1.1 接入 session.history (image 类型), 显示缩略图网格 + 已确认方向标记"
          bordered
        />
      </div>
    );
  }

  return (
    <div className="sc-output-gallery">
      <div className="sc-output-gallery__toolbar">
        <span className="sc-output-gallery__count">{items.length} 张产物</span>
        {items.length >= 2 && (
          <button
            type="button"
            className="ui-button ui-button--ghost ui-button--sm"
            onClick={startCompare}
          >
            A/B 对比
          </button>
        )}
      </div>
      <div className="sc-output-gallery__grid">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className={`sc-output-thumb${isSelected ? ' is-selected' : ''}${item.confirmed ? ' is-confirmed' : ''}`}
              onClick={() => handleSelect(item.id)}
              aria-pressed={isSelected}
            >
              <div className="sc-output-thumb__image-wrap">
                <img src={item.thumbnailDataUrl} alt={`产物 ${item.id}`} className="sc-output-thumb__image" />
                {item.confirmed && <span className="sc-output-thumb__badge" aria-label="已确认">★</span>}
              </div>
              <span className="sc-output-thumb__meta">
                <span className={`sc-output-thumb__status sc-output-thumb__status--${item.status}`}>
                  {item.status === 'passed' ? '✓' : item.status === 'failed' ? '✕' : '○'}
                </span>
                <time>{formatRelative(item.createdAt)}</time>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return '刚刚';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} 分钟前`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} 小时前`;
  return `${Math.floor(ms / 86_400_000)} 天前`;
}

/**
 * useMockGallery — 临时 mock 数据。
 * P3-架构-3 之后会替换成 useShortChainSession.history 真实数据。
 */
function useMockGallery(): OutputItem[] {
  return useMemo(() => {
    // 1x1 透明 PNG 占位
    const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="100%" height="100%" fill="%23E5E2D9"/></svg>';
    return [
      {
        id: 'mock-1',
        dataUrl: placeholder,
        thumbnailDataUrl: placeholder,
        createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
        family: 'space',
        subtype: 'reception',
        status: 'passed',
        confirmed: true,
      },
      {
        id: 'mock-2',
        dataUrl: placeholder,
        thumbnailDataUrl: placeholder,
        createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
        family: 'space',
        subtype: 'reception',
        status: 'passed',
      },
      {
        id: 'mock-3',
        dataUrl: placeholder,
        thumbnailDataUrl: placeholder,
        createdAt: new Date(Date.now() - 25 * 60_000).toISOString(),
        family: 'packaging',
        subtype: 'paper_pouch',
        status: 'pending',
      },
      {
        id: 'mock-4',
        dataUrl: placeholder,
        thumbnailDataUrl: placeholder,
        createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
        family: 'poster',
        subtype: 'brand_key_visual',
        status: 'failed',
      },
    ];
  }, []);
}
