# Phase 1.5：项目内质量恢复与公共能力升级机制

## 背景

Phase 1 把生产链路收敛到 `VisualDecisionPacket → ProjectSpecificGenerationContract → MediaTranslation → PromptContract → Preflight Gate → Adapter`。但这只解决了**链路完整性**,没有解决**单项目失败时的责任边界**。

当前现实:Masterpiece-OS v18 的设计合同是 v3.x 时代的产物,跨大版本演进过程中,默认值、required 字段、reference shape 都已经漂移(decay)。当一个真实项目(典型如 蛙耶 / `未标题-38427f6f`)撞到这些 contract drift,系统无法自动判断"这是当前项目资料不全,还是公共合同有错"。

**这一阶段要解决的事**:
- 单项目失败时,知道在哪一层失败,只修当前项目
- 同一类型问题在多个项目复现时,才升级为公共能力
- 明确禁止"为一个项目的问题改公共代码"

## 设计原则(三条边界)

1. **项目内修复优先,公共代码修改受控**
   单项目失败 → 改项目数据 / Creative Direction / Media Translation / 当前任务 Prompt。
   改公共代码必须满足"两个以上无关项目同型失败"或"明确工程错误"两个条件之一。

2. **失败分类与修复路径一一对应**
   失败不是"Prompt 不够好",而是六种类型之一。每种类型对应一个明确的修复器(repairer),不在类型间漂移。

3. **公共能力升级需要证据,不允许"看着像就升"**
   每个公共模块改动必须能引用至少一个 `ProjectCase` 登记,登记有 `failureType`、`affectedLayer`、`similarCases` 三个必填字段。

## 六种失败类型与对应修复器

| # | 失败类型 | 表现 | 修复器 | 写入位置 |
|---|---|---|---|---|
| 1 | 输入证据不足 | 品牌名是"未标题" / 包装产品未知 / Logo 是否允许改未知 | `ask_user` 阻断 → 关键问题清单 | 仅项目 |
| 2 | 分析字段缺失 | `toneBoundaries` 空 / `upgradeThesis` 不完整 / `brandMisreadRisks` 空 | `AnalysisFieldSelfHealing` (Phase 1.5 已规划) | 仅项目 |
| 3 | 分析字段互相冲突 | 例如:诊断"避免儿童化"+ 决策"高饱和紫绿黄"+ 类别"餐饮"(参见 蛙耶) | `DecisionConsistencyValidator` | 仅项目 |
| 4 | 媒介转译太浅 | 空间转译 = Logo 墙 + 品牌色家具 + 图形海报;看不出"品牌角色 → 空间行为" | `MediaTranslationRepair` | 仅项目 |
| 5 | Prompt 编译丢失信息 | Packet 正确但 Final Prompt 缺核心项目角色 / 升级命题 / 正向机制 | **确定性工程 Bug** → 公共代码直接修 | 公共 |
| 6 | Prompt 正确,图片执行失败 | 模型随机偏离 / Logo 被错误生成 / 构图失控 | 单任务 `image_repair` 内部重试一次 | 仅当前任务 |

第 5 类**不归入"项目失败"**。它是工程 bug,直接修公共代码并要求 case 引用公共 issue,不需要跨项目复现证据。

## Project-Specific Quality Contract

每个项目分析完成后,自动生成**独立于项目数据**的质量合同,作为首图审查的对照基准。

### 数据结构

```ts
interface ProjectSpecificQualityContract {
  schemaVersion: '1.0';
  projectId: string;
  projectIdentity: string[];             // 品牌 / 行业 / 品牌角色
  upgradeThesis: string;                 // 一句话升级命题
  mustPreserve: string[];                // 保留项
  mustTransform: string[];               // 转化项
  positiveMechanism: string[];           // 正向空间 / 媒介机制
  mustBeVisible: string[];               // 必现
  toneBoundaries: Array<{ target: string; avoid: string[] }>;
  misreadRisks: string[];
  deliverableSuccessCriteria: {
    space?: string[];
    packaging?: string[];
    poster?: string[];
    vi?: string[];
  };
  reviewChecklist: string[];             // 项目专属审查清单(可空)
}
```

### 生成路径(关键)

`Quality Contract` 的**字段是固定的**,但**填充**应:
- 从"已知失败模式"(本文件第二节)反推必查项
- 不从 `visualDecisionPacket` 自身正推(避免同质化偏差)
- 与 `Project Generation Contract` 独立生成、独立评估 — 两者**一致**才算 pass

> **同质化偏差风险**:LLM-as-judge 用项目自己的逻辑审查项目自己,会**用本厂标准评价本厂产品**。Quality Contract 必须有外部锚点(失败模式表、行业约束),不能纯从项目数据推导。

## 候选方向(内部 2-3 个,对外 1 个)

新项目第一次分析就给唯一方向,是最容易出错的地方。改为内部先并行 2-3 个方向,内部评审后只展示最优一个,用户操作负担不变。

| 方向 | 风险 | 适用场景 |
|---|---|---|
| Direction A: 保留核心资产并升级 | 资产可能太老 | 品牌资产健康 |
| Direction B: 弱化旧资产,强化产品体验 | 失去识别 | 资产与新定位冲突 |
| Direction C: 从商业角色和用户行为重建设计机制 | 工程量大 | B 也不够 |

### 内部评审器规则

评审不是"哪个更高级",而是按以下维度打分:
1. 来源忠实度(不凭空);
2. 项目独特性(不套行业俗套);
3. 商业适配(目标客群、价位段);
4. 媒介延展性(空间 / 包装 / 海报 / VI);
5. 误读风险(已识别风险是否被强化);
6. Logo 独立性(不依赖 Logo 墙完成识别)。

### 抗同质化偏差

评审 prompt 必须显式加 negative-prompt:
> "不要因为 三个方向都用紫色就偏向紫色 / 不要因为某个方向用词流畅就偏向它"

## 首图审查与 retry 边界

首图生成后必须自动审查,不能让用户是唯一质检员。

### 4 个 outcome

| outcome | 含义 | 处理 |
|---|---|---|
| `pass` | 满足 Quality Contract | 交付 |
| `partial_pass` | 大体对题,但 1-2 项边缘偏离 | 交付 + 一句话说明 |
| `direction_fail` | 方向错误或 Quality Contract 核心项缺失 | 自动 `image_repair` 重试一次 |
| `evidence_fail` | 缺乏证据(reference 资产不全 / locked 资产被忽略) | 不重试,问用户 |

### retry 条件(关键)

`direction_fail` 才 retry,且**只在 retry 能改变结果时**才 retry:
- 模型随机偏离 → 不 retry(同模型同 prompt 同样会偏离)
- Prompt 缺关键约束 → retry(改 prompt 后会改善)
- 缺乏证据 → 不 retry(问用户)

否则 retry 一次 = 多花 30 秒换同样结果,体感更差。

### retry 写入边界

`image_repair` 的修改**只能写入**:
- 当前项目数据
- 当前任务的 Prompt
- 当前任务的 Reference 选择

**不得**写回:
- 公共 Prompt Contract
- 行业模板
- Quality Contract 模板
- Gate 规则

## 公共代码升级 gate

未来所有 Masterpiece 公共模块改动必须满足以下条件之一:

| 条件 | 适用场景 | 例子 |
|---|---|---|
| **两个以上无关项目同型失败** | 通用能力缺失 | 蛙耶 + 另一个完全不同的品牌都出现"决策风险反而被强化" |
| **明确工程错误** | bug 修复 | 字段路径写错 / UI 选项未透传 / Logo Gate 不一致 / Packet 迁移失败 |

**禁止**:为单项目失败改公共代码、为"看着像公共问题"改公共代码、为追赶项目交付压力改公共代码。

### 改之前的 case 引用要求

每次公共模块改动,PR 描述必须引用至少一个 `ProjectCase` 记录(`caseId` + `failureType`),否则 Code Review 拒绝。

## 问题晋升机制

每个项目失败必须登记为 `ProjectCase`,登记表是公共能力升级的唯一数据源。

```ts
interface ProjectCase {
  caseId: string;                          // e.g. 'waye-space-001'
  projectId: string;
  failureType: 'input_evidence' | 'analysis_missing' | 'analysis_conflict'
             | 'media_translation_shallow' | 'compiler_bug' | 'image_execution_fail';
  affectedLayer: 'asset_intake' | 'visual_decision_packet' | 'project_contract'
                | 'media_translation' | 'prompt_contract' | 'preflight_gate' | 'adapter';
  projectOnly: boolean;                    // true 时,公共层不受影响
  publicFixCandidate: boolean;            // true 时,纳入升级候选
  similarCases: string[];                  // 跨项目复现链接
  createdAt: string;
  evidence: {                             // 失败时自动抓取
    logPath?: string;
    preflightFindings?: string[];
    compiledPromptHash?: string;
  };
}
```

### 跨项目复现追踪

同一个 `failureType` 在 5-10 个项目里的命中率超过 30%(可调阈值),由 Dashboard 触发"建议升级公共能力"通知。

不要"两个项目**完全一样**"就升 — 那是罕见孤例;要看**同型问题在不同项目里以不同形式出现**。

## 产品目标三层(对用户)

| Level | 目标 | 用户感受 |
|---|---|---|
| 1 | 无开发者介入 | 用户看不到 `toneBoundaries missing` / `Packet insufficient` / `Logo route conflict` 等技术语言;系统自动修复或转成自然语言问题 |
| 2 | 首轮可评审 | 方向正确 / 项目专属 / 业务成立 / 成果物专业 / 没有严重误读 — 不要求最终成稿 |
| 3 | 受控恢复 | 首轮不通过时,系统知道错在哪 / 只修当前项目 / 最多内部重试一次 / 不污染其他项目 |

## 落地优先级

### P0 — 立刻能落地(本次 蛙耶 触发)

- [ ] 跑 `contract-decay-audit` 任务:对 v3.x → v18 所有 default / required / reference shape,逐个跑"如果项目 data 缺这一字段会怎样",列出 5-10 个最危险的 contract drift
- [ ] 建 `ProjectCase` 登记簿(`history/cases/`)
- [ ] 现有 3 个已修 bug 登记为 `caseId: 'waye-2026-07-31-*'`

### P1 — 中期

- [ ] `AnalysisFieldSelfHealing`:六种失败类型 #2 的修复器
- [ ] `DecisionConsistencyValidator`:#3 的修复器(诊断 vs 决策 vs 媒体转译两两校验)
- [ ] `MediaTranslationRepair`:#4 的修复器
- [ ] `ProjectSpecificQualityContract` 生成器 + 独立审查器

### P2 — 长期

- [ ] 候选方向生成器(2-3 → 1)+ 抗同质化评审器
- [ ] 首图审查 outcome:pass / partial_pass / direction_fail / evidence_fail
- [ ] 跨项目命中率 Dashboard,自动触发公共能力升级候选

## 附录:本次 蛙耶 触发的 3 个 contract decay 案例

这 3 个案例**不是蛙耶专属**,都是 v3.x → v18 contract drift 的产物。它们的价值是给系统**做一次合同体检的探针**。

### Case `waye-2026-07-31-functionalRelationships`

- `failureType`: `analysis_conflict`(实际是 `analysis_missing` — 字段根本生成不出来)
- `affectedLayer`: `visual_decision_packet`
- 根因:`packages/analysis-runtime/src/field-repair-policy.ts` 中 `mediaTranslations.spatial.functionalRelationships` 的 `requiredEvidencePaths` 引用了 `functionalNetwork` + `sceneProgram`(兄弟字段),这两个字段本身是模型新创造的内容,不带 `evidenceRefs`,导致 AI batch evidenceRefs=[] → 触发 `REPAIR_EVIDENCE_UNAVAILABLE` → 模型从未被调用 → 决策永远 incomplete
- 修法:用 `projectFacts.brandRole` 作为 evidence 保底
- 推广:跑 `contract-decay-audit`,扫描所有 `appliesTo: ['space']` 的 `field-repair-policy`,看 `requiredEvidencePaths` 是否有"自指兄弟字段"反模式

### Case `waye-2026-07-31-logoUsageMode`

- `failureType`: `compiler_bug`
- `affectedLayer`: `visual_decision_packet` + `project_context_vnext`
- 根因:`visual-decision-packet.ts:362` 和 `project-context-vnext-builder.ts:104/175` 三处的 `hasLogo ? 'reference' : 'blank_area'` 与 v5 logo locked 协议冲突 — v5 要求 locked logo 走 `post_composite`,但默认值给了 `reference`,而 vnext 后端会拒绝非 `post_composite` 的 logo 任务
- 修法:三处 default 改成 `hasLogo ? 'post_composite' : 'blank_area'`;UI 同步把 `post_composite` 启用、`reference` 标 disabled
- 推广:跑 `contract-decay-audit`,扫描所有 v3.x 时代的 default 值,看 v5/v18 协议下是否仍然合法

### Case `waye-2026-07-31-stalePreflight`

- `failureType`: `compiler_bug`
- `affectedLayer`: `preflight_gate` + 缓存
- 根因:`vnext-service.start` 信任 `compiled-prompt.json` 里缓存的 `preflightReport`,不验证它与当前代码是否一致。任何 preflight 规则改动后,旧 compile 缓存沉默失效,用户必须手动重 compile
- 修法:`start` 检测到 cached preflight blocked 时,自动用 `task-contract.json` 还原 task 重新 compile(透传原 `taskId` 让新结果覆盖同一目录),只有重 compile 后还 block 才报错
- 推广:跑 `contract-decay-audit`,扫描所有 vnext-service 读缓存的位置(除了 preflight,还有 `taskContract`、`compiledPrompt.finalPrompt` 等),看是否都做了 staleness 校验

## 附录:三层判断的明确写法

每次新项目失败,工程团队必须能回答以下三个问题:

1. **本次失败属于六种类型中的哪一种?**
   不是"Prompt 不够好"这种含糊回答。
2. **修复写入位置是项目内还是公共层?**
   项目内:数据 / Creative Direction / Media Translation / 当前任务 Prompt。
   公共层:仅限明确工程 Bug + 跨项目复现证据。
3. **如果写公共层,引用哪个 ProjectCase?**
   没有 caseId = 禁止写公共代码。

---

## 复盘:蛙耶这次 debug 教会了什么

5 个小时在蛙耶上修的 3 个 bug,**没有一个是蛙耶专属的**。它们都是 v18 design contract 在跨大版本演进中的 decay 表现,只是被蛙耶的数据形状暴露了。

**蛙耶作为探针的真正价值**:不是 fix 这一个项目,而是**触发了一次合同体检**。后续对其它 5-10 个项目跑 `contract-decay-audit`,大概能找到 30-50 个类似 drift。

**最终目标不是"任何项目一次必中"**,而是:
- 第一次失败,改项目,不改系统
- 第二次同型失败,改系统(要有数据)
- 第三次同型失败,改设计

三层判断要明确写在产品行为里,不能"今天改了,明天又改"。
