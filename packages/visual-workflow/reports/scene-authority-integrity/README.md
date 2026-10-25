# RKS-02C.2 完整性审批与回归收口

日期：2026-10-25（Asia/Shanghai）。冻结起点 `874efc07f56610a67c0c1842ecce60191f987375`，来源分支 `codex/rks-scene-authority-compatibility`，工作分支 `codex/rks-scene-authority-integrity`。

**累计四文件候选摘要已按用户本轮明确授权登记，完整离线回归通过；代码完整性接受不代表视觉质量通过。** 三个未映射公开场景仍为产品兼容性阻塞。两项根仓库历史文件政策测试仍单独失败，不宣称所有仓库测试全绿。

## 审批前核验与源码审查

更新前工作树干净，HEAD 与冻结提交完全一致。审批单路径为 `reports/scene-authority-compatibility/protected-change-approval.json`，其原字节 SHA256 和核验明细保存在 [manifest-change-audit.json](manifest-change-audit.json)。四个实际候选摘要全部与单据一致，其余 **129 条后端、4 条前端**完整性记录均与原 manifest 一致。

从 RKS-02C 开始前的 `949a838d0fbdb70f27d600e6a93c4545f8751e12` 到冻结起点，生产源码差异恰为以下四文件。完整差异见 [cumulative-source-review.diff](cumulative-source-review.diff)。

| 累计文件（相对于本包） | 审查结论 |
| --- | --- |
| `src/generation-runtime/space/compiler.js` | custom 仅输出来源程序预览，区分全局依赖与镜头可见性，镜头 gate 为 review_required；已映射场景的编译分支不变 |
| `src/generation-runtime/space/source-adapter.js` | storefront 取得明确程序/镜头来源；未知场景拒绝；custom 需同项目、完整源程序且无镜头/请求指令/参考输入，只保留预览文本，无可执行 owner；源句、边界、去重与负向 guard 保持各自职责 |
| `src/generation-runtime/space/continuation/target-functional-programs.js` | 增加通用 storefront 外立面程序与默认视图，不引入品牌/行业审美，也不授予窥见室内权限 |
| `src/generation-runtime/space/scene-projection/target-scene-projection.js` | 增加通用场景词汇、中文/英文功能网络依赖、源子句范围和节点证据；未知网络/隔窗权限待审；合法跨场景隐私边界继续有效 |

没有关闭或修改完整性守卫、修改 Provider/Seedream 配置、B1 策略或添加品牌特判。该审查接受上述有限实现范围，不把确定性文本规则视作通用自然语言理解，不解决真实布局、窗口权限、模板/材料方向及视觉质量。

## 受控 manifest 更新

唯一修改的既有文件为 `packages/visual-workflow/implementation-integrity.json`；仅替换四个已指定条目的 SHA256，格式及其他内容保留。精确差异见 [manifest.diff](manifest.diff)，全部旧/新摘要见审批核验 JSON。

| 文件 | 登记后的候选 SHA256 |
| --- | --- |
| compiler.js | `a6614dce173d79c159854c19fe649d71204037a52183d1d0467242afad4cf352` |
| source-adapter.js | `b4fe223f16c1cf4e0bde5a83e936e598ed6eb63fb7ccb6fe94fd61af0e649299` |
| target-functional-programs.js | `11636ed4f30bbb4dd4c6530318062c189bd3928a74b48a1c214c13fe85350725` |
| target-scene-projection.js | `78be27d7523ee10561005f553e51e9a90c801791ae52842f575d51ce63267598` |

更新后重新检查 **133 条后端、4 条前端**记录全部一致；现有 `verifyImplementation()` 正常通过。implementationDigest 为 `4b8ea1fa7c759bc05a42cf1ffd95e8b321f91aa9dfa63c283256250a4a8c5410`。

`qualityAcceptance` 仍为 `pending-separate-quality-repair`，`extractionStatus` 仍为 `independent-current-implementation`。没有更新其他摘要、独立 Prompt Hash、Golden、P7B 或历史质量/知识记录。此阶段生产源码改动为 **0**；新增脚本仅用于离线回归和只读证据生成，没有摘要刷新模式。

## 完整离线回归

命令、退出码、耗时、测试计数、原始/规范化日志摘要见 [regression-results.json](regression-results.json)。CRLF、行尾空白与终止换行仅作日志规范化，诊断正文保留。下列测试有重叠，不能相加为独立总量。

| 验证 | 结果 |
| --- | --- |
| RKS-02C 场景/visible owner/scene decision/隐私专项 | **82/82 PASS** |
| RKS-02C.1 原 methodology + custom 契约专项 | **16/16 PASS**，包含原四项 custom 回归 |
| 完整 visual-workflow | **249/249 PASS**；此前五项完整性拒绝解除 |
| verify:current-flows | **PASS**；文档准备 2/2、Runtime 1294/1294、Node Host/Web 类型检查通过；此前两项拒绝解除 |
| repo:verify | **PASS**；含 Repository Contract、完整性隔离、离线 current-flows、分析门禁及边界反例 |
| golden:test | **5/5 PASS**；Provider 0，Golden 自动更新 NO；保留历史 NOT_READY 等状态，不作新视觉接受 |
| repo:guard:test | **56/56 PASS** |
| Node Host / Web typecheck | 分别独立 PASS |
| production-boundaries / no-project-specific-production-rules | 分别独立 PASS |
| 两项历史 repository-policy | **0/2，独立 FAIL**；与起点相同的两份交付文档和五张栅格图位置冲突，未删除资产、放宽规则或修改测试 |

[closure-evidence.json](closure-evidence.json) 逐名核对前阶段记录的五项工作流、两项 current-flows 失败，现在均出现在对应通过日志中。所有规定的回归命令都真实执行；没有把完整性摘要更新本身当作测试通过。

## 不变性与边界证明

[invariance-proof.json](invariance-proof.json) 保存 P7B、B1、Golden、Provider/Prompt 策略、守卫及公开路由各组受保护路径、冻结 Git tree 摘要、文件计数及逐文件 SHA256，并确认相对冻结起点无差异。现有真实用户项目未读写；离线测试仅使用仓库合成资料和临时测试项目/模拟 transport。

storefront、entrance、dining 的 A/B 共六组输入摘要、正式/Provider Prompt SHA256、sourceMap 和镜头权威与 RKS-02C 记录一致。完整性摘要更新不会改变这些编译文本。对照明细在 closure 证据中。

未知场景继续拒绝，外立面未知活动不会自动取得可见性；合法隐私边界和隔窗待审规则继续通过专项。custom 预览仍为 `review_required`、镜头权限 none；带正式任务参数的 custom 在模板路由被拒绝，不因完整性登记而变成正式生图功能。

## 独立产品阻塞与下一阶段

`exhibition`、`interior_panorama`、`counter` 仍在 UI 可选而缺少生成程序映射，实测继续阻断。本轮不映射、不改 UI、不虚报支持。主线合入前必须落实经过审核的选项门禁/迁移方案，或补齐各自能力与验收，详见独立[产品兼容性处理建议](public-scene-blockers.md)。该风险与本次代码完整性及离线回归通过分开记录。

下一阶段先做冯烫烫逐镜头输入、材料/灯光和模板语义的设计审阅，详见[质量审核建议](next-design-quality-review.md)。真实 A/B、窗口接口、模板/材料修改和质量记录更新需另行明确授权，本轮未执行。

真实分析、真实生图、模型校验、自动重试、用户真实项目写入、合并、部署及发布均为 **0**。本轮完成提交后停止，等待人工审核；未推送远程，不进行主线合入。
