# Product Analytics Framework — Masterpiece OS

> **目的**：建立最小可用的产品度量体系，让我们能用数据回答
> "用户在产品里经历了什么"和"我们做的事有没有用"。
>
> **原则**：先有基线，再优化。先覆盖核心漏斗，再扩展到细分行为。
> 不追求完美，追求"每周能看、能指导决策"。

---

## 1. 核心漏斗：Short-Chain 主路径

这是最重要的一组数据。用户从打开产品到获得一张满意的图，
每一步有多少人、流失多少。

```
App 打开
   │
   ▼
项目创建 / 选择已有项目 ────────  Step 1
   │
   ▼
文档上传 + 解析成功 ───────────  Step 2
   │
   ▼
参考图上传（如有） ────────────  Step 3
   │
   ▼
点击「生成」按钮 ─────────────  Step 4
   │
   ▼
生成成功（至少 1 张图） ───────  Step 5
   │
   ▼
再次生成（同项目 24h 内） ─────  Step 6
```

### 每个步骤的定义

| 步骤 | 事件名 | 触发时机 | 属性 |
|------|--------|----------|------|
| App 打开 | `app_open` | 应用首次加载完成 | `session_id`, `entry_page` |
| 项目创建 | `project_create` | 新项目成功创建 | `project_id`, `source`（新建/导入） |
| 文档上传 | `document_upload_start` / `document_upload_complete` | 开始上传 / 解析完成 | `project_id`, `file_type`, `file_size`, `parse_status`, `duration_ms` |
| 参考图上传 | `reference_upload` | 参考图上传完成 | `project_id`, `count`, `total_size` |
| 点击生成 | `generate_click` | 用户点击生成按钮 | `project_id`, `mode`（空间/包装/其他）, `reference_count`, `has_document` |
| 生成开始 | `generate_start` | 后端收到生成请求 | `project_id`, `run_id`, `mode`, `provider`, `model` |
| 生成成功 | `generate_success` | 生成完成且至少 1 张图成功 | `project_id`, `run_id`, `image_count`, `duration_ms`, `provider`, `model` |
| 生成失败 | `generate_fail` | 生成全部失败 | `project_id`, `run_id`, `error_category`, `error_message`, `duration_ms`, `provider`, `model` |
| 再次生成 | `generate_retry` | 同项目 24h 内第二次点击生成 | `project_id`, `retry_count`, `retry_reason`（可选） |

---

## 2. 失败分类体系

生成失败不能只记一个"失败"——我们需要知道**为什么失败**，才能判断
是该优化产品体验、改进错误处理、还是换 Provider。

### 一级分类

| 类别 | 说明 | 典型原因 | 用户侧感知 |
|------|------|----------|-----------|
| `provider_error` | 模型服务商错误 | 429 限流、5xx 服务不可用、鉴权失败 | "生成失败了，请稍后再试" |
| `timeout` | 超时 | 请求发出后长时间无响应 | "生成超时了，我们正在重试" |
| `content_policy` | 内容合规拦截 | 触发安全审核、违规内容 | "内容不符合规范，请调整描述" |
| `input_validation` | 输入不合法 | 参考图格式不支持、文档解析失败、参数缺失 | "上传的文件格式不支持" |
| `system_bug` | 系统 Bug | 空指针、Schema 校验失败、未预期异常 | "出了点问题，我们已经记录" |
| `user_cancel` | 用户主动取消 | 用户点击了取消 | — |

### 二级分类（Provider 错误细分）

| 子类别 | 触发条件 |
|--------|----------|
| `provider_rate_limit` | HTTP 429 |
| `provider_auth` | HTTP 401 / 403 |
| `provider_server` | HTTP 5xx |
| `provider_unknown` | 其他 Provider 侧错误 |

---

## 3. 质量指标

### 生成质量

| 指标 | 定义 | 目标基线 | 计算方式 |
|------|------|---------|----------|
| 生成成功率 | 至少 1 张图成功的运行比例 | ≥ 95% | `generate_success / (generate_success + generate_fail)` |
| 部分成功率 | 多图生成中部分成功的比例 | 跟踪 | `partial_success_runs / total_runs` |
| 平均生成耗时 | 从点击生成到看到结果的时间 | P50 < 60s, P95 < 180s | 所有 generate_success 的 duration_ms 百分位 |
| 自动重试成功率 | 第一次失败后自动重试成功的比例 | ≥ 30% | `retry_success / total_retries` |

### 激活与留存

| 指标 | 定义 | 目标基线 | 计算方式 |
|------|------|---------|----------|
| 首次生成成功率 | 新用户第一次点击生成后成功的比例 | ≥ 60% | 新用户 cohort: generate_success / generate_click |
| 首次生成尝试次数 | 新用户首次成功前的平均点击次数 | < 1.5 | 新用户 cohort: 首次成功前的 generate_click 数 |
| 7 天留存 | 首次使用后 7 天内有二次生成的比例 | ≥ 30% | cohort 分析 |
| 周活跃用户（WAU） | 一周内至少有 1 次生成成功的用户数 | 跟踪增长趋势 | 自然周 |

### 用户满意度

| 指标 | 定义 | 目标基线 | 收集方式 |
|------|------|---------|----------|
| 生成后 CSAT | "这次生成结果你满意吗？"（1–5 星） | ≥ 4.0 | 生成成功后弹出单题问卷（可选） |
| 失败后反馈 | "这次失败的原因你觉得是？"（多选） | 收集率 ≥ 10% | 失败页面底部反馈入口 |
| NPS | "你有多大可能把这个工具推荐给朋友？"（0–10） | ≥ 20 | 每 4 周对活跃用户弹出一次 |

---

## 4. 技术实现方案

### 4.1 架构

```
前端（apps/web）          后端（apps/web-runtime / runtime-core）
    │                            │
    ├─ track(event) ─────────────┤  RPC 调用
    │                            │
    │                            ├─ 写入本地事件日志（JSON Lines）
    │                            ├─ 内存聚合（实时指标）
    │                            └─ 每日快照（导出 JSON 摘要）
    │
    └─ 指标展示页（/settings/metrics，本地查看）
```

### 4.2 埋点 SDK（前端）

在 `apps/web/src/sdk/` 下新增 `analytics.ts`：

```typescript
// 简单的分析 SDK
interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
}

function track(eventName: string, properties?: Record<string, any>): void
function identify(userId: string): void
function getSessionId(): string
```

**规则**：
- 所有事件通过 RPC 发送到后端持久化
- 失败不阻塞主流程（fire-and-forget）
- 离线时暂存本地队列，上线后补发
- 不收集任何个人身份信息（PII）

### 4.3 后端存储

- **格式**：JSON Lines（每行一个事件）
- **位置**：`.runtime/analytics/events-YYYYMMDD.jsonl`
- **保留**：本地保留 90 天，过期自动清理
- **隐私**：所有事件匿名化，不包含 API Key、文件内容、生成图片

### 4.4 指标看板（MVP）

- 一个简单的 `/settings/metrics` 页面
- 显示核心漏斗转化率、生成成功率、平均耗时、失败分类分布
- 支持按日期范围筛选
- 后端提供一个 `analytics.getSummary(dateRange)` 的 operation
- 第一版用原始数据计算，不做复杂的聚合优化

---

## 5. 实施计划

### Week 1: 基础设施

- [ ] 定义事件 Schema（TypeScript 类型 + JSON Schema 校验）
- [ ] 前端 analytics SDK 实现
- [ ] 后端事件接收 + JSON Lines 存储
- [ ] Session ID 生成与管理

### Week 2: 核心漏斗埋点

- [ ] App 打开、项目创建、文档上传事件
- [ ] 参考图上传、点击生成事件
- [ ] 生成开始 / 成功 / 失败事件（后端侧）
- [ ] 失败分类体系落地（所有失败路径都有 error_category）

### Week 3: 指标看板 MVP

- [ ] 后端 `getSummary` operation（核心漏斗 + 质量指标）
- [ ] 前端 Metrics 页面（表格 + 简单柱状图）
- [ ] 每日自动生成前一天的指标快照

### Week 4: 迭代完善

- [ ] 留存指标计算（cohort 分析）
- [ ] 导出功能（一键导出 CSV/JSON）
- [ ] 第一份周度产品数据快照
- [ ] 根据数据发现，调整埋点覆盖范围

---

## 6. 隐私与数据安全

- **匿名化**：所有事件不关联真实身份，只有随机生成的 session_id 和 local_user_id
- **本地优先**：数据默认只存在用户本地，不上传任何服务器
- **可选分享**：如果用户愿意帮助改进产品，可以选择"匿名分享使用数据"，默认关闭
- **数据导出/删除**：Settings 页面提供完整的数据导出和一键清空功能
- **不收集敏感内容**：不收集文档内容、生成图片、Prompt 文本、参考图内容

---

## 7. 第一周要回答的问题

等度量体系跑起来第一周后，我们应该能回答：

1. 有多少用户打开了产品？其中多少人创建了项目？
2. 文档上传的成功率是多少？失败主要因为什么？
3. 有多少比例的用户会上传参考图？
4. 点击生成后，成功率是多少？主要失败原因是什么？
5. 平均生成耗时是多少？P95 呢？
6. 生成成功的用户中，有多少会在 24 小时内再次生成？

**如果这些问题答不上来，说明度量体系还没做好。**
