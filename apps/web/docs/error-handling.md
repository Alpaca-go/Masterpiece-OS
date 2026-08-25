# 错误处理规范（Masterpiece OS Web）

> 路线 A / P3.5 — 三级错误分级 + 统一展示模式

## 三个级别

| 级别 | 触发条件 | 组件 | 持续时间 | 阻断？ | 例子 |
|------|----------|------|----------|--------|------|
| **Inline（内联）** | 表单字段级校验、即时反馈 | `input` 下方的红色文字 | 持久（直到修正） | 是（该字段） | "请填写项目名称"、"API Key 不能为空" |
| **Toast（吐司）** | 操作结果反馈，可恢复、可重试 | `useToasts` + ToastViewport | 5 秒自动消失 | 否 | "项目已删除"、"图片上传失败，可重试" |
| **Banner（横幅）** | 页面级阻塞状态、需用户决策、严重错误 | `<Banner>` 组件 | 持久（用户主动关闭） | 是（页面级） | "启动失败：主进程未响应（20 秒超时）"、"API Key 无效，请前往设置" |

## 决策流程

```
产生错误？
  │
  ├─ 是表单字段的错误？
  │     └─ ✅ Inline：直接在字段下方显示
  │
  ├─ 是单次操作失败？用户已经看到操作结果？
  │     └─ ✅ Toast：5 秒后自动消失，不阻塞后续操作
  │
  ├─ 是页面级阻塞，错过后用户继续不下去？
  │     └─ ✅ Banner：持续显示，带"重试/前往设置"等操作按钮
  │
  └─ 是 splash 阶段（启动初始化）？
        └─ ✅ Splash error：和 splash 一起渲染，单独的失败页
```

## 调用约定

### Toast（最常用）
```tsx
import { useToasts } from './components/layout/Toast';

const { push: pushToast } = useToasts();

// 操作成功
pushToast({ tone: 'success', title: '项目已保存', duration: 5000 });

// 操作失败（可重试）
pushToast({ tone: 'error', title: '删除失败', detail: cleanError(reason), duration: 5000 });
```

### Banner（页面级）
```tsx
import { Banner } from './components/ui/Banner';

<Banner tone="error" onClose={() => setError('')}>
  主进程启动超时。
  <button onClick={retry}>重试</button>
</Banner>
```

### Inline（字段级）
直接在字段下方 `<small className="form-error">…</small>`，不要用 Banner 或 Toast。

## 何时升级错误级别

**Inline → Toast**：错误发生在用户操作 *之后* 且与具体字段无关时（如后端拒绝、文件 IO 失败）

**Toast → Banner**：错误阻塞了用户继续操作，且不会自动恢复时（如未配置 API Profile 之前所有操作都会失败）

## tone 配色

| Tone | 主色 | 用途 |
|------|------|------|
| `error` | 红色 | 操作失败、阻塞性错误 |
| `warn` | 橙色 | 警告、需注意但可继续 |
| `info` | 蓝色 | 信息提示 |
| `success` | 绿色 | 操作成功 |

所有 tone 都使用设计系统 token（`--color-error-*` / `--color-warning-*` 等），自动跟随主题切换。
