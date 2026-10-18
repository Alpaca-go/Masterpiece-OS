# 校验策略受控测试：摘要更新与离线放行报告

日期：2026-10-16。状态：用户已批准四项候选摘要更新；离线门禁通过；真实调用等待本轮费用确认。测试目标仅为验证新自动校验流程，不证明九州美学空间画质恢复。不合并、不发布、不冻结质量。

## 授权范围核对

逐项验证 `validation-policy-digest-review.json` 的四个 candidateSha256 与磁盘源码一致，并验证修改前完整性 manifest SHA-256 为审查附件记录的 `e153cb61cfa3eeec269178251eec409d405770427dcb35a1097d282df1675fb9`。

本轮对 `implementation-integrity.json` 仅作四项 sha256 的定点替换，其他字节未改。未改任何生产源码、其他功能、分析 Prompt、Golden、原项目文件或质量验收状态。`qualityAcceptance` 仍为 `pending-separate-quality-repair`。

更新后 manifest SHA-256：`3dddc8f21fb1154f9456b81b6869d1b22db0033e5acf47831308119da78afb9d`。运行时 implementationDigest：`ab3302821d6ba1acae9026967b9cc0996711a279debc1fa96d31c0956234470d`。四项前后摘要及授权范围见 [更新审计](./validation-policy-integrity-update.json)；人工质量状态不随实现摘要变化。

## 本轮离线结果

| 检查 | 结果 |
|---|---|
| 独立完整性与双向隔离 `verify:visual-workflow-isolation` | 通过 |
| 包内校验策略与空间质量回归 | 20/20 通过 |
| `repo:check` | 完整串行通过，退出码 0 |
| `repo:verify`、`verify:current-flows` | 已由上述完整命令执行并通过，未跳过完整性门禁 |
| 隔离与仓库守卫反例 | 56/56 通过 |
| 根测试 | 1701/1701 通过 |
| CLI | 40/40 通过 |
| Runtime | 基础 14/14；应用 1294/1294 通过（current-flows 中亦通过） |
| Web smoke | 通过，0 Provider 调用、0 业务写入 |
| Web build | 通过，含 Renderer typecheck；Node Host typecheck 由 current-flows 通过 |
| Golden | 5 个用例 PASS，0 Provider 调用，未更新任何 Golden |
| 空间 Golden 边界 | 通过 |
| `git diff --check` | 通过 |

日志目录：`E:/image-quality-regression-evidence/validation-policy-controlled/`。完整主日志 `repo-check.log`；另外保留 `isolation.log`、`owned-tests.log`、`web-build.log`、`space-golden.log`。

## 单列：既有公共宿主断言

额外执行 `npm run web-runtime:test`：14/15，通过数与失败数如实保留，退出码 1。唯一失败为 `apps/web-runtime/tests/node-runtime-host.test.ts:36` 的通道数量断言，actual=256、expected=236；与前轮报告已复现的问题一致。

此命令不属于根 `repo:check` 串行命令，所以不能将它的失败写成 repo:check 失败，也不能把它隐去后宣称所有测试通过。宿主源码、通道注册和该断言均未修改。日志 `host-tests.log` 留存；本轮不处理公共宿主问题。

## 独立项目预演

对现有独立九州美学项目 `ecfcdf23-a81d-4cd2-8250-74ecd221b7fb` 执行只读预演：context valid、sufficiency ready、spatial semantic pass、编译 preflight pass，正式标准生图 Prompt 已保存。预演前后原项目逐文件 SHA-256 相同；fetch 显式禁用，网络调用 0。

预演证据保存在 `E:/image-quality-regression-evidence/validation-policy-controlled/preflight/`，包括 `candidate-preflight.json`、`candidate-prompt.txt`、`candidate-source-inventory.json`。它们是本次新增证据，未覆盖以前受控运行。真实测试获确认后使用新建隔离存储的一次性副本，不写原项目；独立测试 ID 与存储路径区分测试运行，项目 ID 可在该独立存储内保持相同。

仓库外执行器 `E:/image-quality-regression-evidence/run-validation-policy-controlled.mjs` 已准备并通过语法检查，尚未执行。其启动要求本轮费用确认标记，传输层限定最多 1 次生图和 1 次图像校验，禁止自动重生成及隐式额外图像请求，不将历史人工图送作生图参考。执行器不会改变生产校验参数或独立保存配置。

## 待确认的调用方案与费用

- 生图：独立配置 `volcengine / doubao-seedream-5-0-pro-260628`，standard / reception / entrance_view，16:9、2K、单张、零图片参考；最多一次模型请求。
- 校验：独立配置 `dashscope / qwen3.6-plus`（北京端点），最多一次请求。仅本次执行器设置 `enable_thinking=false`、`max_tokens=4096`；输入估算须在 256K 价格档内，使用量越界或未知时停止，不追加任何调用。
- 官方价格于本轮重新查阅：[Seedream 价格](https://docs.volcengine.com/docs/ark/model-pricing?lang=zh) 的 2K 单图档 0.60 元；[Qwen3.6-plus 北京价格](https://help.aliyun.com/zh/model-studio/qwen3-6-plus) 在输入不超过 256K 时，输入 2 元/百万 tokens、输出 12 元/百万 tokens。
- 按校验输入控制值 256000 tokens、输出 4096 tokens 预留，单次校验 0.561152 元，连同单张生图预留合计 1.161152 元。建议本轮费用授权上限 **2 元人民币**。这是目录价与控制参数的预算，不冒充已出账金额或平台账户级硬扣费上限；最终按账户账单核对，不计优惠。

获确认后保留首图、最终 Prompt、完整脱敏请求体、校验请求与报告、Provider/model、调用计数、耗时、终态、源项目前后哈希及待人工验收状态；原始响应只在仓库外保存，不含凭据头，不提交原始 Provider 响应或加密凭据目录。校验完成但 unverified/failed 也应正常保留首图并交人工复核，不因状态追求 passed 而再次生图。

当前真实模型调用：**0**。因用户明确要求“真实调用前报告费用上限并等待确认”，停在费用确认步骤；收到新确认前不运行该执行器。本轮尚无真实图像流程验证结果，也无画质恢复结论。

## 后续执行记录

本报告是调用前留存的预演与费用申请记录。用户随后明确批准，已完成最多一次生图与一次图像校验；结果见 [受控真实测试结果](./validation-policy-controlled-results.md)。此前的“0 次调用、等待确认”描述保留其预演时点含义，不代表实际测试尚未执行。
