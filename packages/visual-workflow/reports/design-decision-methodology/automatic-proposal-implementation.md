# 自动设计提案：实验分支实现

日期：2026-10-24。状态：代码与离线/网页验收通过，允许隔离人工试用；真实模型的跨项目设计及生图质量尚未验收。未合并或发布。

## 最终行为

在独立视觉工作流的默认统一视觉分析请求中，模型现在区分项目事实与设计提案。它结合当前素材、项目说明和业务需求，主动提出功能节点、连接关系、设施使用方式、视觉载体与范围、材料光学表现、配色表面与构图要求。明确允许专业设计推导，不再要求所有方案答案已经出现在原资料里。未知尺寸、结构和设备规格不得被当成事实补造。

新结果可附 `mediaTranslations.spatial.designProposal`，仅接受 `sourceType: model_proposal`，记录推导依据、假设与待确认问题。网页自动预填，并显示三类说明；来源栏注明模型提案，保存和确认仍由用户显式操作。未自动保存、未自动确认，旧草稿/确认方向不覆盖，重新分析后继续要求核对既有方向。

这是现有统一视觉理解阶段的默认策略替换，不是另加一个模式或共享能力。没有改变模型选择、Provider、请求次数、重试上限或收费逻辑。既有前置分析阶段仍存在，后续统一视觉理解和结构化决策成为生图依据。

当前统一视觉理解阶段仍由已有图片分析素材触发；测试时请上传原始品牌视觉图片或已有导入流程提取出的图片。纯文字/PDF 且未形成图片分析素材的路径，本次没有扩展为新的自动空间提案入口。不要把 PDF-only 流程完成直接当作这套方法已执行。

## 修复与兼容

- Packet 整理保留模型明确输出的 `surfaceApplicability`、合法 `spatialUsage` 和 `compositionRequirements`，防止网页自动预填缺项。旧数据没有这些字段时仍保持缺失，不合成默认范围。
- 在 `mustBeVisible` 中，具有明确物件和使用关系的语句保留功能职责；标识、装饰母题和颜色几何的既有检查仍优先。不为某一品牌或行业新增例外。
- 新提案元数据是可选扩展，缺失不修改历史输入。模型声称 `user_confirmed` 不会获得提案或确认权限。
- 只涉及 `packages/visual-workflow` 与对应 Web feature。策划、视觉迁移、公共宿主、其他 Compiler/Adapter 和根 lockfile 未修改。
- [完整性审查](implementation-review.json)逐项记录六个经审查实现文件的前后摘要，其余条目逐项验证未变化；这是用户授权的实验实现登记，质量验收字段保持原值，不是更新 Golden 或冒充质量通过。

## 验证证据

| 检查 | 结果 |
|---|---|
| 独立工作流 JS 回归 | 30/30 PASS |
| 独立工作流 TS 回归（含 5 项新增链路测试） | 99/99 PASS |
| 第一阶段跨项目验收 | 6/6 PASS；两项原失败现已修复 |
| repo:verify | PASS，包含 current-flows、隔离与反例测试 |
| web:build | PASS，保留原有 bundle size 提示 |
| golden:test | PASS，零 Provider、无 Golden 更新；这是既有记录检查 |
| 历史九州有效 Packet + task，原版/候选编译比较 | 两者正式 Prompt SHA256 同为 `031d2d20b203d73b5a11b77c27792bde9b02a15cc912c8e0c5f2d9f8dd886ab9` |
| 本地真实 Node Host + 网页 | 离线样例自动预填，依据/假设/待确认显示，未编辑字段即可保存草稿和确认成功 |

新增链路测试以合成模型输出经 Packet 整理、建议投影、保存确认进入正式编译及注入的图片 Adapter，检查最终实际构造的请求包含设施关系、构图与颜色边界。网络由 fixture 替代；**不是调用模型，也不是生成质量证据**。

网页 QA 使用 `.runtime/proposal-browser-user-data`、端口 5191/4361 和明确的合成项目，未配置真实凭据，未调用分析/生图服务。截图保存在本地 `.runtime/automatic-proposal-web.png` 和 `.runtime/automatic-proposal-confirmed.png`。它们不进入 git，不是客户项目或质量样本。

历史编译比较见 [摘要记录](historical-compiler-parity.json)。这是正式 Prompt 的编译一致性，不是新做的真实 Provider 或完整 Adapter 请求重放。

## 真实试用

在 PowerShell 中执行：

```powershell
cd E:\MP-methodology
& .\packages\visual-workflow\scripts\start-design-proposal-test.ps1
```

打开 `http://127.0.0.1:5189/#/visual-workflow`。若首次启动跳到设置页，页面加载后再次打开该地址；使用“独立模型设置”配置本功能的分析/生图模型，不配置公共模型来替代它。

脚本使用 `.runtime/design-proposal-test-user-data`，不复制正式项目或凭据。新建项目、上传真实视觉素材、填写项目说明并运行分析。分析完成后检查自动填入的“项目设计方向”，核对假设、待确认条件与执行字段，保存草稿并确认，再智能生成。不需要手工逐项设计；模型漏填或语义冲突仍由现有检查提示，不能承诺任意素材首轮全字段完备。

先选择两个不同类型的新项目，预先约定验收关系和模型预算，保存所有结果及调用次数，不择优掩盖失败。记录模型、终态、时长、报告/图片路径和合成结果。真实模型仍可能不遵循提案；需要人工确认是否达到预期，不能凭离线通过宣布通用质量成功。

## 退出

Ctrl+C 停止测试终端；继续从 `E:/Masterpiece-OS-Main-Publish-20261015-Verified` 启动原版。原版仍是 `main @ 98bcac78943bd97a24d8f536ada833a929b31672`，无需 reset 或恢复数据。不要在实验目录直接裸跑默认启动后误用正式 userData；使用上述隔离脚本。
