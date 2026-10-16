# 自动校验与纠正策略修复审查

日期：2026-10-16。状态：候选代码与离线测试完成，等待审查；不冻结质量、不合并、不发布。用户人工结论：首次生成优于一次定向纠正后的图像，两张均未达到历史人工验收基准。本轮真实模型调用为 0。

## 变更与行为

仅修改本包四个既有业务文件，新增包内测试与报告；创意策划、视觉迁移、Web UI、共享宿主、依赖、锁文件、项目数据均未修改。

| 文件 | 修复 |
|---|---|
| `src/generation-runtime/generation/deliverable-validator.js` | 区分 generation 阶段与 post_composite 交付；Logo 留白不构成资产违规。增加分别限定的结构缺失、非身份禁用内容、非身份资产违规、错误生成身份的证据字段。旧混合字段保留为待复核线索，不作为阻断。质量、品牌语气疑点为 advisory；uncertain/unknown 不再通过。所有 retryRecommended=false。 |
| `src/runtime/image-generation/deliverable-validator-service.js` | 校验请求明确要求 Logo/字体留白，不以缺失 Logo 判断违规；错误生成的文字或标志须单独报告位置与可见形状；实际 Logo 完整性留待合成。 |
| `src/runtime/image-generation/short-chain-service.js` | 删除 startValidated 的自动重生成分支，不接受旧 retryRecommended=true 作为收费授权；成功首图始终返回并选中。校验异常转 unverified，保留运行与首图，不泄漏异常中的 Provider 内容。增加按 runId 的摘要，不只保存会被覆盖的 taskId 摘要。Logo 合成审计另标 post_composite、source_recorded_pending_visual_review 与待人工验收。 |
| `src/contracts/index.js` | unverified/failed 均进入 awaiting_human_review，不再把它们或第二张 passed 当作整个流程通过。历史 correctionRun 只进入人工复核，不做图像优劣排序。 |

本轮移除自动重生成机制，因此没有自动生成候选，也没有自动替换首图。显式另一次 generate 调用仍是新的独立生图运行，具备独立 run/image/validation 摘要和会话历史；其通过状态不修改上一运行记录。没有新增基于原图编辑的能力。结果字段明确 imageEditingSupported=false、sourceImageAttached=false、contentPreservationGuaranteed=false；保留的文字重生成 Prompt 编译函数同样明确原图未提供，不能保证画面保留。

Logo 校验不使用中英文关键词正则来猜测缺失描述：旧混合字段全部保留复核，限定字段只承载对应非身份内容；旧字段不明时给 unverified。模型即使把错误归入新字段，仍无权触发第二次收费生图。blockingFindings 必须附证据文本，并标明 model_observation_requires_review；它是模型观察，不能冒充人工确认的事实。后期合成现有确认、素材存在、裁剪及边界检查保持；保存真实素材摘要和输出摘要，合成成功也不冒充视觉完整性验收。

## 测试和验证

本轮新增 13 项离线测试，连同既有空间质量回归共 20/20 通过。覆盖后期合成留白、错误生成文字、非阻断提示、不确定性、结构阻断证据、旧重试误触发、首图保留、两次显式运行独立记录、校验异常、无图像编辑能力的状态、请求阶段语义、实际像素合成及显式确认。测试全部使用临时目录与合成图像，不依赖本机实际项目、不访问网络。

| 命令 | 结果 |
|---|---|
| `node --import tsx --test packages/visual-workflow/tests/*.test.*` | 20/20 通过 |
| `npm test` | 1701/1701 通过 |
| `npm run cli:test` | 40/40 通过 |
| `npm run runtime:test` | 基础 14/14；应用 1292/1294，两项因实现摘要失配被阻断 |
| `npm run repo:verify`、`npm run repo:check` | 未通过；完整性检查报告 `VISUAL_WORKFLOW_IMPLEMENTATION_CHANGED: src/contracts/index.js` |
| `npm run verify:current-flows` | 已执行，未通过；同上两项工作流操作被完整性门禁阻断，后续 typecheck 未由此命令执行 |
| `npm run repo:guard:test` | 56/56 通过，含双向隔离反例 |
| 版本一致性/命名、workspace 边界、obsolete/production/tracked 边界、专有规则、Golden 边界、analysis guards | 独立逐项执行均通过 |
| `npm run web-runtime:test` | 14/15；唯一失败 `256 != 236`，与此前报告中已复现的宿主通道计数失败一致；未修改无关测试或宿主 |
| `npm run web-runtime:typecheck`、`npm run web:build` | 通过 |
| `npm run web:smoke` | 通过；0 Provider 调用、0 业务写入 |
| `npm run golden:test` | PASS；5 个用例、0 Provider 调用、无 Golden 更新 |
| `npm run verify:space-golden-boundary` | 通过 |
| `git diff --check` | 通过 |

完整日志在 `E:/image-quality-regression-evidence/validation-policy/`。repo:verify 在完整性检查停止后，已将剩余守卫逐项运行，不能将它们的通过合称为完整 repo:verify 通过。根 Golden 的历史 VISUAL_MANUAL_ACCEPTED 标签仅属历史样例，不能转移为本轮质量结论。

## 完整性与审查边界

`implementation-integrity.json` 未更新，冻结 Prompt、Golden、人工验收基准均未改。完整性门禁仍有效；本轮候选不能作为已放行生产实现运行。四个修改文件的前后摘要见 [摘要审查附件](./validation-policy-digest-review.json)。这是候选审查材料，不是更新摘要或视觉验收的授权。

本轮修改校验请求和状态策略，属于行为变化；在线视觉效果没有验证，也没有声称质量恢复。下一次真实模型调用须等待新授权。当前只提交候选代码、离线证据与 [九州美学差异诊断](./packet-visual-diagnosis.md)。若拒绝候选，可逐项恢复这四个文件至附件所记基点；不执行 reset，不动原项目与历史图片。
