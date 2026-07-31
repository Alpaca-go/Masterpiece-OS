# Contract Decay Audit — v3.x → v18 设计合同体检

## 背景

`phase1.5-project-quality-recovery-loop.md` 把"合同在跨大版本演进中会 decay"列为 Masterpiece OS 当前最大的设计债务。v18 的设计合同(`packages/project-contracts/`、`packages/creative-production-runtime/`、`packages/image-generation-runtime/`)大部分是 v3.x 时代的产物,跨大版本演进过程中默认值、required 字段、reference shape 都已经漂移。

蛙耶这个项目一次性触发了 3 个 contract drift(`functionalRelationships` evidence 自指、`logoUsageMode` default 错、`preflight` 缓存陈旧),**没有一条是蛙耶专属**,都是 v18 contract decay 的普遍表现。

这一阶段的任务:**在更多项目踩到之前,系统性扫一遍 v18 contract 找出 decay 项**,作为公共能力升级的依据。

## 目标

1. **列出 v18 contract 全部 decay 风险项**(目标 5-10 个 Critical/High)
2. **每个风险项登记为 ProjectCase**(`caseId` + `failureType` + `affectedLayer`)
3. **区分"必须修公共代码"vs"项目内可绕过"**,给出处理建议
4. **不修**,只审计 — 修是后续 sprint 的事,audit 只产出报告

## 范围

### 扫描的合同(白名单)

```
packages/project-contracts/src/index.ts
packages/creative-production-runtime/src/project-generation-contract.js
packages/creative-production-runtime/src/creative-decision.js
packages/creative-production-runtime/src/creative-direction.js
packages/creative-production-runtime/src/visual-decision-packet.ts
packages/creative-production-runtime/src/locked-assets.js
packages/creative-production-runtime/src/visual-canon.js
packages/creative-production-runtime/src/style-profile.js
packages/image-generation-runtime/src/vnext/task-contract.js
packages/image-generation-runtime/src/vnext/prompt-compiler.js
packages/image-generation-runtime/src/vnext/user-confirmed-visual-decision.js
packages/image-generation-runtime/src/vnext/compile.js
packages/image-generation-runtime/src/gates/prompt-preflight-gate.js
packages/analysis-runtime/src/field-repair-policy.ts
packages/analysis-runtime/src/analysis-completion-orchestrator.ts
apps/desktop/src/main/pipeline-service.ts
apps/desktop/src/main/visual-decision-packet.ts
apps/desktop/src/main/project-context-vnext-builder.ts
apps/desktop/src/main/creative-direction-service.ts
apps/desktop/src/main/reference-first-reconstruction.ts
apps/desktop/src/main/image-generation/vnext-service.ts
apps/desktop/src/main/image-generation/logo-post-composite.ts
apps/desktop/src/main/image-generation/vnext-deliverable-validator-service.ts
apps/desktop/src/main/settings-store.ts
apps/desktop/src/main/project-store.ts
apps/desktop/src/renderer/src/components/VNextGenerationWorkspace.tsx
```

总共 ~25 个文件,人工 walk-through 大约 8-10 小时,可以分两天完成。

### 不在范围内

- 行业模板(`prompts/v5/`、`templates/`)— 这部分是 Phase 1 已经收敛的"通用审美"层,不许带项目 specifics;如果发现问题,说明"通用审美"越界了
- 测试 fixture — fixture 反映的是"过去",不是 contract
- 文档 — 文档跟代码的 drift 是另一个问题(Phase 1.5 不解决)

## Drift 模式分类(7 类)

每种 drift 模式都有**可检测的特征**和**对应的修法建议**。

### 模式 1:Default 值漂移

**特征**:`hasX ? 'foo' : 'bar'` 形式的 hard-coded default,default 在 v3.x 合理但 v5/v18 协议下已非法或被强制覆盖。

**检测方法**:
```bash
# 搜索所有"truthy ? 字符串 : 字符串"形式的 default
rg "hasLogo \? '[a-z_]+' : '[a-z_]+'" packages/ apps/desktop/src/main/
```

**风险点**(从 蛙耶 已知):
- `visual-decision-packet.ts:362` `hasLogo ? 'reference' : 'blank_area'` → v5 logo locked 协议要求 `post_composite`
- `project-context-vnext-builder.ts:104/175` 同上

**修法建议**:default 必须从 contract schema 推导(`officialOutput` 或 `promptSourceObject` 字段),不能写死。

### 模式 2:Required 字段未声明

**特征**:某个字段在 v3.x 时代是 optional,代码里也没写 required,但 v18 后端实际强制要求(运行时 throw `field_required`)。schema 文档和代码不一致。

**检测方法**:
- 找 `if (!value) throw new Error('xxx is required')` 这类硬校验,看对应字段在 schema 里是否标了 `required`
- 找所有抛 `XXX_REQUIRED` 错误码的位置,看 schema 文档

**已知风险点**:
- `task-contract.js:23-32` 抛 `projectId` / `subtype` / `shot` / `currentInstruction` required,但 `VNextTaskContract` schema interface 里这些字段都是 optional 标注
- `compileVNextImageGeneration` 隐式要求 `projectContext.visualDecisionPacket` 不为 null,没有运行时 throw,但 preflight 会 block

**修法建议**:runtime 校验要和 schema 必须保持一致(可考虑用 zod 之类单一来源)。

### 模式 3:requiredEvidencePaths 自指

**特征**:`field-repair-policy.ts` 里某字段的 `requiredEvidencePaths` 引用了"自己会生成但不带 evidenceRefs"的兄弟字段(例如新创造的内容)。AI batch evidenceRefs 永远为 0 → `REPAIR_EVIDENCE_UNAVAILABLE` → 模型从未被调用。

**检测方法**:
```bash
# 对每个 applicableTo=['space'] 或 ['packaging'] 的 field-repair-policy,
# 检查 requiredEvidencePaths 里每个 path 实际能不能提供 evidenceRefs
# 关键判据:path 在 packet 里若是 string array / string / 新创造的 object,都视为无 evidence
```

**已知风险点**:
- `field-repair-policy.ts:226-236` `functionalRelationships` 引用 `functionalNetwork` + `sceneProgram`(都不带 evidence)
- 类似问题可能存在于所有 `appliesTo: ['space']` 的 policies 中

**修法建议**:每个 `requiredEvidencePaths` 至少有一个**上游事实字段**(`projectFacts.brandRole` / `abstractions` / `diagnosis.*`)作为保底。

### 模式 4:Contract schema 漂移(写者消失)

**特征**:某个 contract 文件被**读**但全工程**无人写**。第一次运行必 fail,但因不是同步 throw,失败信号延迟到"preflight 找不到数据"。

**检测方法**:
```bash
# 找所有 .json / .md 文件的 writeFile 调用方
rg "writeFile.*creative_decision|writeJson.*creative_decision" apps/desktop/src/ packages/
# 然后对照所有 readFile
rg "readFile.*creative_decision|readJson.*creative_decision" apps/desktop/src/ packages/
```

**已知风险点**:
- `creative_decision.json` — 唯一写者是 `creative-direction-service.ts`,但该 service 没有任何 IPC handler 暴露 → renderer 永远调不到
- `user-confirmed-visual-decision.json` — **全工程无写者**,只有 `vnext-service.ts:194` 在读

**修法建议**:要么补齐写者路径,要么改 contract 编译逻辑(像我们已经做的 `synthesiseApprovedDecision`)在读端兜底。

### 模式 5:默认值 vs 强制值的边界冲突

**特征**:代码 A 层"宽容地给个 default",代码 B 层"强制要求某个特定值"。两层语义不一致,UI 默认值必触发 B 层拒绝。

**检测方法**:
- 对每个 contract 字段,搜所有"赋值"和"校验"
- 标记"赋值默认 X"vs"必须 X"vs"必须 ≠ X"的三种状态
- 找冲突

**已知风险点**:
- A 层 `visual-decision-packet.ts:362` 给 `logoUsageMode: 'reference'`
- B 层 `vnext-service.ts:170-175` 在 `preferredLogoAssetId` 存在时强制 `'post_composite'`
- 冲突:UI 选 reference 必被后端拒绝

**修法建议**:contract 字段 default 必须是**最终被接受的值**,不能是"宽容但实际非法"的中间值。

### 模式 6:缓存 staleness

**特征**:某处把"应该每次实时算"的东西 cached 在文件里(`.json` artifact),且 reader 不验证 cached 值与当前代码是否一致。代码改动后,旧 cache 沉默失效。

**检测方法**:
```bash
# 找所有 .json 写盘 + .json 读盘 的位置,看 reader 是否重新校验关键字段
# 关键词:preflightReport, validation, approvedDecision, sourceFingerprint
```

**已知风险点**:
- `vnext-service.ts:303-318` 信任 `compiledPrompt.preflightReport` 缓存,fix 后需用户手动重 compile 才能生效(已修)
- 类似风险可能存在于 `validation.json` 缓存、image generation run artifacts 的 `gate` 字段等

**修法建议**:所有 cached 校验字段必须带 `sourceFingerprint` + `compilerVersion` 等"陈旧度"信号,reader 检测到 staleness 时自动 re-run。

### 模式 7:隐式 Contract 未文档化

**特征**:代码里有隐式规则("有 logo 必须走 post_composite"、"first-pass 必须 outType=concept_image"),但**没有写在 schema 文档、TypeScript type、prompt、README 任何地方**。新 contributor 必踩。

**检测方法**:
- 找代码里的硬规则:`if (logo && mode !== 'post_composite')`、`if (count !== 1)`、`mode === 'reference' && !asset`
- 这些规则应有对应的 contract 文档

**已知风险点**:
- Logo Locked → post_composite(已用代码 force,但 prompt / schema 没说)
- vNext `count` 必须 = 1(`vnext-service.ts:319-323` 校验,schema 没明说)
- reference 模式 + 无 logo 自动 fallback(已用代码 fallback,但 schema 没明说)

**修法建议**:每条隐式规则写进对应 schema interface 的 JSDoc 注释,加 1-2 句"为什么这样约束"。

## Audit 执行流程

### 第一步:静态扫描(2-3 小时)

按 Drift 模式分类,对白名单 25 个文件做 regex 扫描。输出一份候选 drift 列表。

```bash
# Mode 1 扫描:hard-coded default
rg -n "hasLogo \? '[a-z_]+' : '[a-z_]+'" packages/ apps/desktop/src/

# Mode 4 扫描:无写者
rg -l "readFile.*creative_decision|readJson.*creative_decision" packages/ apps/desktop/src/ | \
  xargs -I{} sh -c "rg -l 'writeFile.*creative_decision|writeJson.*creative_decision' {} || echo 'NO_WRITER: {}'"

# Mode 7 扫描:硬规则
rg -n "if \(.*\?\? '|if \(.*=== '[a-z_]+'\)" packages/ apps/desktop/src/main/ | head -50
```

预期产出:`docs/phase1.5-audit-candidates.md`,包含 ~30-50 个候选 drift 项。

### 第二步:人工分级(4-6 小时)

对每个候选 drift,人工判断:
- 是否**真 drift**(不是 false positive)
- 风险等级 Critical / High / Medium / Low
- 写入边界(项目内可绕过 vs 必须改公共代码)
- 关联的 `ProjectCase`(有的话)

风险分级标准:
- **Critical**:首次运行必挂,无法项目内绕过(类比 `functionalRelationships` evidence 自指)
- **High**:特殊 data shape 触发,绕过成本高(类比 `logoUsageMode` default)
- **Medium**:能项目内绕过但需要用户感知操作(类比 `preflight` 缓存陈旧)
- **Low**:仅代码气味,不影响功能

### 第三步:输出报告(1-2 小时)

按 `AuditReport` schema 输出,落到 `docs/phase1.5-contract-decay-audit-report.md` 和 `history/cases/`。

```ts
interface AuditReport {
  schemaVersion: '1.0';
  generatedAt: string;
  scannedFiles: number;
  totalDrifts: number;
  drifts: AuditDrift[];
  recommendations: {
    mustFix: string[];           // caseId 列表
    canDefer: string[];          // caseId 列表
    noActionNeeded: string[];   // caseId 列表
  };
}

interface AuditDrift {
  caseId: string;
  failureType: 'default_drift' | 'required_drift'
             | 'evidence_path_self_ref' | 'contract_writer_missing'
             | 'default_vs_required_conflict' | 'cache_staleness'
             | 'implicit_contract_undocumented';
  affectedLayer: 'visual_decision_packet' | 'project_contract'
                | 'media_translation' | 'prompt_contract' | 'preflight_gate'
                | 'adapter' | 'asset_intake' | 'image_execution' | 'vnext_session';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  evidence: { files: string[]; lineRanges: Array<[string, number, number]> };
  recommendedFix: {
    layer: 'public' | 'project';
    sketch: string;
    estimatedEffort: 'trivial' | 'small' | 'medium' | 'large';
  };
  relatedCases: string[];       // 已知的类似 case
}
```

### 第四步:案例登记(1 小时)

每个 Critical/High drift 登记为 `ProjectCase`,落到 `history/cases/<caseId>.json`。

```json
{
  "caseId": "audit-2026-08-01-001",
  "projectId": "audit-synthetic",
  "failureType": "default_drift",
  "affectedLayer": "visual_decision_packet",
  "projectOnly": false,
  "publicFixCandidate": true,
  "similarCases": ["waye-2026-07-31-logoUsageMode"],
  "createdAt": "2026-08-01T00:00:00.000Z",
  "evidence": {
    "logPath": null,
    "preflightFindings": null,
    "compiledPromptHash": null
  }
}
```

## 第一批已知 Drift(从 蛙耶 触发)

| caseId | failureType | severity | 状态 |
|---|---|---|---|
| `waye-2026-07-31-functionalRelationships` | `evidence_path_self_ref` | critical | ✅ 已修 |
| `waye-2026-07-31-logoUsageMode` | `default_drift` | high | ✅ 已修 |
| `waye-2026-07-31-stalePreflight` | `cache_staleness` | medium | ✅ 已修 |

这 3 个 case 在 `phase1.5-project-quality-recovery-loop.md` 附录有完整分析。

## 后续 5-10 个项目实测

audit 的扫描只能找**静态 drift**(代码层),找不出**数据形状触发的 drift**(某些 drift 只在特定 data 组合下才暴露)。所以 audit 完成后,还要:

1. 找 5-10 个**不同行业 / 不同品牌 / 不同复杂度**的真实项目
2. 跑完整 analysis + image generation 流程
3. 记录任何 `PROMPT_PREFLIGHT_BLOCKED` / `analysis_repair_failed` / `compile_*` 错误
4. 每个错误登记为 `ProjectCase`,标注 `triggered_by: '<project_id>'`
5. 累计 10 个 case 后,统计 `failureType` 分布
6. 任何 `failureType` 出现在 ≥ 3 个项目里,自动升级为 `mustFix` 候选

## 怎么用 Audit 结果

### 修公共代码

**必须满足条件之一**:
- Critical severity
- `failureType` 在 ≥ 3 个不同项目里复现
- 明确工程 Bug(满足 Phase 1.5 主文档的"明确工程错误"条件)

**禁止**:
- 仅 1-2 个项目触发的 drift 进公共代码(可能项目自身有特殊问题)
- 没有 caseId 引用就改公共代码
- "看着像公共问题"就改(同质化偏差风险,见 Phase 1.5 主文档 §Quality Contract)

### 登记为 ProjectCase 但不修

满足以下条件之一,只登记不修:
- Medium/Low severity
- 仅 1-2 个项目触发
- 暂时没有自动绕过方案,但手动绕过成本可控

### 修项目数据

**不修公共代码、不登记为 ProjectCase**,只在项目内绕过:
- 用户操作不当触发的问题(类比 蛙耶用户操作错误)
- 项目资料不全(类比 品牌名"未标题")
- 单项目特殊需求(类比 VI 字体要定制)

## 不要做(避坑)

1. **不要一次性修完所有 drift** — 一次只修 1-2 个 Critical,且每个 fix 必须独立 PR + case 引用
2. **不要试图 100% 修复 contract drift** — 全部修完需要 2-3 sprint,且可能引入新 drift;持续审计 + 按需修更稳
3. **不要把 audit 结果写到 README / 主文档** — audit 是内部工作文档,不是用户文档
4. **不要为 audit 单独建新模块** — audit 是一次性任务,产出一份报告即可,不要把它做成常驻 service
5. **不要跨项目套 audit 结果** — audit 出的 contract drift 是"潜在风险",需要 5-10 项目实测验证,不要一发现就改公共代码

## 时间与人力

| 步骤 | 时间 | 人力 |
|---|---|---|
| 第一步:静态扫描 | 2-3 小时 | 1 senior |
| 第二步:人工分级 | 4-6 小时 | 1 senior + 1 designer 协作 |
| 第三步:输出报告 | 1-2 小时 | 1 senior |
| 第四步:案例登记 | 1 小时 | 1 dev |
| 后续实测 | 持续 2-3 周 | 在日常项目交付中并行 |
| **总计** | **~10-12 小时一次性 + 持续 2-3 周实测** | |

## 产出物

| 文件 | 内容 |
|---|---|
| `docs/phase1.5-audit-candidates.md` | 第一步产出,~30-50 个候选 drift |
| `docs/phase1.5-contract-decay-audit-report.md` | 第三步产出,正式 audit 报告(分级 + 修复建议) |
| `history/cases/audit-*.json` | 第四步产出,每个 Critical/High 一份 |
| `history/cases/synthetic-*.json` | 后续 5-10 项目实测产出的 case |

## 与 Phase 1.5 主文档的关系

本文件是 `phase1.5-project-quality-recovery-loop.md` 的**具体执行方案**:
- 主文档定原则(项目内修复优先 / 六种失败类型 / 公共升级 gate)
- 本文件定 audit 的执行细节(白名单 / drift 模式 / 报告 schema / 时间人力)

**不要**把本文件内容塞进主文档 — 主文档保持设计原则层,本文件保持执行方案层。
