# 空间生图质量回归候选修复

状态：程序验证进行中；实现变更待审核；真实生图待运行；视觉质量待用户确认。禁止合并。

基点：`5270b00`；分支：`fix/visual-workflow-image-quality-regression`。
修改前工作树干净，`verify:visual-workflow-isolation` 与 `repo:verify` 通过。
附件六张图已经逐张检查。附件未包含输入、Packet、Prompt、请求、运行 ID 或模型记录，不能从图片推断参数或建立受控因果关系。

## 已证实的代码缺陷

1. Packet 初始就绪检查遗漏 signatureSpatialMechanism、functionalNetwork、functionalRelationships。旧 Packet 的 ready 标记也被 source adapter 信任。候选修改对真实非空内容进行检查，旧 ready 标记不再绕过校验。空间机制可为动线或建筑机制，不要求任何品牌必须具备艺术装置。
2. sufficiency 的数组检查仅数元素；空白字符串也能满足最少数量。候选只计非空字符串或非空对象。
3. semantic repair 会删除不安全功能条目；完成编排未重新执行 sufficiency，pipeline 随后直接写入 ready。候选在清洗后重新验证，丢失必需内容时失败并记录缺失路径，不再静默放行。
4. compileSpatialMechanisms 将 decorative_object 落入 functionalSemantics；source adapter 的品牌输入没有消费这个层。候选仅将明确来自 signatureSpatialMechanism 的物理装置放入品牌层，不混入建筑或商业功能。
5. brand sanitizer 将含品牌主题的物理艺术装置转为表面行为或删除。候选保留经过既有 Logo、运营、道具、长文和颜色渐变规则检查的明确装置；没有加入品牌专有关键词或强制装置。

这些是可复现的数据丢失及门禁缺陷，不等于证明六张图的完整退化原因，也不等于质量已恢复。

## 本地运行线索

发现独立工作流已完成的项目 `ecfcdf23-a81d-4cd2-8250-74ecd221b7fb`，项目名“九州美学”。
位置：`%APPDATA%/masterpiece-os-desktop/visual-workflow/data/projects/`。
迁入记录声明一次性复制、无同步；无法据此认定它就是附件六图的来源。
独立配置：分析 dashscope / qwen3.6-plus；图像 volcengine / doubao-seedream-5-0-pro-260628。
未读取或输出任何凭据值。用户已授权真实生图，原始项目/运行来源待确认。

项目 Packet 的 brandRoleManifestation 明确提出接待区大型艺术装置，而 signatureSpatialMechanism 已倾向曲线天花与纹理光影，材料/颜色也存在紫色与金属主导的输入倾向。不能只靠下游编译恢复输入里并未完整表达的人工验收材质意图；不得据样图编造分析事实。

## 变更审核范围

仅修改以下六个既有生产文件：

- `src/runtime/visual-decision-packet.js`：Packet 非空门禁。
- `src/analysis-decisions/deliverable-sufficiency.js`：排除空白数组项。
- `src/analysis-decisions/analysis-completion-orchestrator.js`：清洗后重新验证。
- `src/generation-runtime/space/source-adapter.js`：拒绝旧就绪标记掩盖的数据空缺。
- `src/generation-runtime/space/semantic/compile-spatial-mechanisms.js`：装置进入品牌层。
- `src/generation-runtime/space/semantic/sanitize-brand-expression.js`：保留明确物理装置。

新增 `tests/spatial-quality.test.ts`，覆盖缺失字段、空白数组、清洗失败、旧 Packet 在编译清洗后内容归零、装置的层级及 Provider 请求、Logo/渐变保护、普通酒店与包装反例。
无全局业务、共享宿主、依赖、生产 Prompt 文件或 Golden 修改。没有引入平行编译器或历史实现。

## 完整性保护与待执行项

未更新 `implementation-integrity.json`。其失配按设计阻断独立操作和 repo:check；不能把它计为程序验证通过。需要用户审核上述候选差异后，才可受控更新这六个文件的完整性摘要，并保留前后摘要记录。此动作不属于图像验收。

本地原始日志位于 `E:/image-quality-regression-evidence/`。完整测试结果及最终证据将在验证结束后补充。真实 Provider 未运行，没有伪造样片。原图只作为对照，不进入 Provider 请求。

## 当前程序验证报告

| 命令 | 结果 | 证据 |
| --- | --- | --- |
| 修改前 `repo:verify` | 通过 | baseline-repo-verify.log |
| 新增缺陷测试，修改前 | 5 项中 4 项失败 | defect-reproduction.log |
| `node --import tsx --test packages/visual-workflow/tests/spatial-quality.test.ts` | 7/7 通过 | candidate-spatial-quality.log |
| `npm test` | 1701/1701 通过 | candidate-root-tests.log |
| `npm run cli:test` | 40/40 通过 | candidate-cli-tests.log |
| `npm run runtime:test` | 基础 14/14；应用 1292/1294；2 项被完整性门禁阻断 | candidate-runtime-tests.log |
| `npm run verify:current-flows` | 未通过；在相同 2 项完整性检查处停止，下游未宣告通过 | candidate-current-flows.log |
| `npm run repo:verify`、`repo:check` | 未通过；实现摘要失配，未更新摘要 | candidate-repo-verify.log、candidate-repo-check.log |
| `node --test tests/visual-workflow-boundary-guard.test.js` | 15/15 通过，包含双向隔离反例 | candidate-boundary-negative-tests.log |
| `npm run web-runtime:test` | 14/15；通道数 256 与期望 236 不符 | candidate-host-tests.log |
| 宿主测试基点模块重放 | 同样 256 != 236，证明该失败并非候选修复引入 | baseline-host-replay.log |
| `npm run web:build` | 通过 | candidate-web-build.log |
| `npm run web:smoke` | 通过；0 Provider 调用、0 业务写入 | candidate-web-smoke.log |
| `npm run golden:test` | 通过；0 Provider 调用、未修改 Golden | candidate-golden.log |
| `npm run verify:space-golden-boundary` | 通过 | candidate-space-golden.log |
| `git diff --check` | 通过 | 工作树差异审查 |

宿主基点重放通过仓库外测试 loader 在读取六个已改模块时使用 `git show 5270b00:<path>`，其余源文件与基点一致；没有替换工作树文件，也没有把历史实现引入生产。受保护的宿主测试和通道注册代码均未修改。应另案处理计数断言，本次没有越界修复。

测试曾因包内新增测试使用特定品牌主题词触发生产词扫描；测试已改用通用薄片装置案例，扫描及根测试重新通过。该过程没有修改扫描规则或 Golden。

## 实际项目的离线证据链

`actual-project-mapping.json` 记录已发现项目的 Packet 指纹、任务、原有品牌字段、基点清洗结果及候选清洗结果；`candidate-final-prompt.txt` 与 `candidate-provider-body.json` 记录候选编译和配置模型的请求体预演，均只保存在仓库外本地证据目录。

同一条实际输入“接待区：通过大型艺术装置（抽象羽毛/花瓣）展示品牌美学高度。”在基点被改写为“表面/肌理行为：…抽象层叠、舒展的曲面/柔和层叠的曲面肌理…”。候选保留原句，最终 Prompt 与 Provider 请求体均包含该句。该差异有具体输入与基点代码证据，不是由效果图猜测。

真实入口已核对：Web 独立 API → `visual-workflow:*` → `service.js` → 独立编译/图像服务 → 独立 multi-model adapter。请求预演任务为 standard/reception/entrance_view、16:9、2K、1 张，模型来自独立配置；参考图为 0。adapter 添加既有通用商业图片前缀与比例/数量说明，完整编译 Prompt 保留为其后缀，未发现截断。预演不包含请求头、凭据或网络调用，不冒充实际请求。

历史 Reference First 手工验收记录仅证明历史路径曾获认可，不能把它迁移为当前标准生图的验收结论。附件六图与已有本地项目的运行对应关系仍待用户确认。

命名与范围审计：新增测试文件和标识均为语义命名，未新增版本/阶段/日期/迭代身份的业务实现；未删改兼容项。所有仓库变更均位于 `packages/visual-workflow/`。冻结 Prompt、人工验收图、Golden、其他两项业务及完整性记录均未修改。

## 当前停留点

用户已经授权真实生图，并批准以现有独立九州美学项目作为测试对象；仅允许读取原项目，在独立测试记录中重生成，禁止覆盖原素材、报告、历史结果与人工验收基准。用户暂未批准完整性摘要更新，要求先审查六个生产文件。完整差异、摘要对照、风险及回退方案现见 [候选实现差异审查报告](./image-quality-change-review.md)。完整性门禁仍生效，未绕过它运行真实业务操作。当前停止等待审查批准，无质量通过结论、无合并、无发布。
