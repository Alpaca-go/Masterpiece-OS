# 独立九州美学生图：受控更新与离线预演

状态：实现修复已获用户批准进入受控测试；完整性更新与离线验证完成；等待本轮真实调用执行确认。视觉质量仍待人工验收，不合并、不发布。

## 受控摘要更新

逐项核对已审核六项候选源文件 SHA-256，全部与审查附件一致。原 manifest 文件 SHA-256 也与审查记录一致。仅替换 `packages/visual-workflow/implementation-integrity.json` 的对应六项 `files[].sha256`；其余字节、121 项摘要、Prompt、frontendFiles、兼容字段及质量验收状态均未改。

implementationDigest 从 `4f39fdd70653498e41b483155a3892b48146c85acdfa24ce9a72ffb8653fe47b` 变为已审核候选的 `3a56ee9273df553f74807322fcc77747b98bcfa6046800a45705a806d198fb30`。qualityAcceptance 仍为 `pending-separate-quality-repair`。

审计附件：[六项受控变更记录](./authorized-integrity-update.json)。不是质量通过记录。

## 验证结果

| 命令 | 结果 |
| --- | --- |
| verify:visual-workflow-isolation | 通过 |
| 新增 spatial-quality 测试 | 7/7 通过 |
| repo:check 串行复跑 | 完整通过，退出码 0 |
| repo:verify、verify:current-flows | 由上述完整命令执行并通过 |
| 根测试 | 1701/1701 通过 |
| CLI | 40/40 通过 |
| Runtime | 基础 14/14；应用 1294/1294 通过 |
| 仓库守卫与隔离反例 | 56/56 通过 |
| Web smoke、Web build | 通过；smoke 无真实 Provider 调用 |
| Golden、空间 Golden 边界 | 通过；未改基准 |
| 独立执行 web-runtime:test | 14/15；唯一失败为既有 256 != 236 通道数断言 |

首次完整验证在并行执行其他检查时，文档取消测试出现时序失败；未修改其代码或测试。单独复测该文件 8/8 通过，随后串行重跑整个 repo:check 完整通过。保留首次失败，不以重跑记录覆盖它。宿主通道计数失败已在基点重放中复现，按用户要求单列，不修改无关宿主代码。

日志在 `E:/image-quality-regression-evidence/`：`authorized-repo-check.log`（首次失败）、`authorized-document-cancellation-recheck.log`、`authorized-repo-check-recheck.log`（完整通过）、`authorized-host-tests.log`、`authorized-spatial-tests.log`、`authorized-web-build.log`、`authorized-space-golden.log`。

## 原项目只读检查与离线预演

对象为已获准的独立项目 `ecfcdf23-a81d-4cd2-8250-74ecd221b7fb`。完整性校验启用；读取现有项目上下文并执行 context 校验、独立 deliverable sufficiency、空间语义门禁和正式纯编译函数，再使用独立 adapter 编译请求体。未调用网络，没有重新分析或覆盖上下文。

- 现有 Packet 充分性：ready；空间语义：pass；编译 preflight：pass，findings 为空。
- 范围固定：space / reception / entrance_view / standard / 16:9；请求 2K、单张，无参考图。
- 模型：独立配置的 `volcengine / doubao-seedream-5-0-pro-260628`，没有切换模型或借用其他业务配置。
- 最终 Prompt 与请求体保留原输入“大型艺术装置（抽象羽毛/花瓣）”的完整描述。基点同条件预演不保留原句。
- 对照结果只有 `brand_translation` 块变化。原 Packet 材料与颜色完全相同；最终 material、lighting、architecture_language、functional_requirement、composition 块逐字一致，没有在本次修复中进一步改变材质或配色。
- 这不表示原 Packet 的紫色、金属倾向已经符合人工验收图；本次没有通过改写分析数据来消除这种差异。
- 预演前后对原项目全部文件逐项哈希比对，一致；没有覆盖素材、分析报告、历史编译或生成图。

完整离线记录：`E:/image-quality-regression-evidence/controlled-preflight/` 下的 `candidate-preflight.json`、`candidate-prompt.txt`、`baseline-preflight.json`、`baseline-prompt.txt`、`comparison.json` 及两份 source-inventory 文件。请求体预演不包含请求头或真实凭据，不冒充实际模型请求。

## 待确认的实际调用方案与费用

接待区、入口视角、16:9、2K，先生成 1 张。使用现有独立业务入口及验证链路；正常为 **1 次 Seedream 生图 + 1 次 Qwen 图像校验，共 2 次模型调用**。若既有质量校验判定需要定向纠正，最多再生图和校验各一次，**总计最多 4 次调用、2 张图**；无额外随机重试，不重新进行视觉分析。

当前官方公开按量价：Seedream Pro 的 2K 档单图 0.60 元，两张生图部分最多 1.20 元；Qwen3.6-plus 北京输入不超过 256K 时，输入 2 元/百万 tokens、输出 12 元/百万 tokens。来源：[火山方舟价格](https://docs.volcengine.com/docs/ark/model-pricing?lang=zh)、[Qwen3.6-plus 官方价格及长度限制](https://help.aliyun.com/zh/model-studio/qwen3-6-plus)。不计免费额度或折扣。

**建议本次费用授权上限：5 元人民币。** 正常预计约 0.60 元生图费加少量校验 token 费用；发生一次定向纠正，生图部分最多 1.20 元。

为让预算可控，申请同时批准以下仅限独立测试运行的执行参数：验证请求关闭思考并限制最多输出 4096 tokens；不改变生图 Prompt、模型、尺寸、比例或生产实现。实际验证请求与参数变化全部留档。验证输入须在 256K 档内；不满足时停止，不升级计费档。按每次输入最多 256K、输出最多 4096 计算，两次验证公开价上界约 1.123 元，加两次生图合计约 2.323 元，预算留至 5 元。实际账单仍需按该账号的专属 MaaS 端点价格核对；若无法确认该端点价格适用于预算，停止并报告，不以公开价冒充账户账单或承诺绝对扣费上限。

这些限额只在获确认后的测试执行器中应用，不改源包、完整性摘要、独立保存的模型配置或原项目。禁止额外隐式调用；失败、超出调用数、超出预算或不明计费时停止。

获批后在新的独立测试运行目录保存一次性输入/上下文快照、受控模型选择、实际 Prompt 与脱敏请求体、模型响应身份与 usage、图像、调用计数、耗时、终态及原项目前后哈希。原项目仍只读；测试凭据不进入仓库或报告。人工基准图只作并排审核，不上传作生图参考。确认 Logo 的后期合成规则保持，若缺少必要定位信息则单列待合成状态，不伪造品牌字样。

当前实际模型调用次数为 **0**。本报告提交后等待用户执行确认；不把此前的真实生图一般授权当作本轮预算确认。
