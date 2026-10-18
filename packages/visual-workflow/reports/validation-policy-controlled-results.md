# 自动校验策略：受控真实测试结果

日期：2026-10-16。状态：本轮真实流程验证完成；人工视觉质量仍待审核。不合并、不发布、不冻结质量，等待下一阶段空间视觉质量修复指令。

## 执行范围与结果

| 项目 | 记录 |
|---|---|
| 测试目标 | 验证新的校验流程、Logo 分阶段语义、首图保留和禁止自动重生成；不证明九州美学画质恢复 |
| 测试 ID | `a3e5d606-d0ba-466b-b8b3-9449800e5011` |
| 源项目 | `ecfcdf23-a81d-4cd2-8250-74ecd221b7fb`，一次性独立副本 |
| 运行 ID | `30a280c6-b194-4082-b502-adf60370c651` |
| 时间（北京时间） | 2026-10-16 20:26:43–20:27:44 |
| 总耗时 | 61.444 秒 |
| 生图模型 | volcengine / `doubao-seedream-5-0-pro-260628` |
| 校验模型 | dashscope / `qwen3.6-plus`，北京端点 |
| 固定任务 | standard / reception / entrance_view；16:9、2K、单张、零图片参考 |
| 实际调用 | 生图 1 次、校验 1 次，均 HTTP 200；无额外模型请求 |
| 自动重生成 | 0 次，无 correctionRun |
| 输出尺寸 | 2816×1584 |
| 自动校验终态 | `passed`；仅为本次模型交付校验结果 |
| 人工验收 | `pending_human_review`；未更新原有质量验收状态 |
| Logo | 未合成；`pending_post_composite`，不宣称完整品牌交付 |
| 原项目保护 | 本轮前后逐文件 SHA-256 完全一致 |

## 流程不变量核对

实际校验返回 `logoTextStatus=absent`，但 `lockedAssetViolations=[]`、`blockingFindings=[]`，没有把未合成 Logo 升级为资产违规。`validationStage=generation`，Logo 完整性保持 `pending_post_composite`，`humanReviewRequired=true`。流程终态 passed 与待人工验收同时存在，含义分别是自动检查与人工质量状态。

`automaticRetryCount=0`、`correctionPolicy.automaticRegeneration=disabled`。首图记录、selectedImage 和唯一 attempts 记录一致；图像 SHA-256 与磁盘文件一致；独立 runId 摘要正确保存。实际生图请求无 image 字段，未输入首图或历史人工图；状态明确 `imageEditingSupported=false`、`contentPreservationGuaranteed=false`。没有以文字重生成冒充局部编辑。

最终 Prompt SHA-256：`9494e7cf932217af59d3aaa45a9d74781d4f5365682dd2fae8069bac807a5f5d`，与本轮调用前预演逐字一致；本轮没有为改善图像质量改写生图 Prompt。

本轮实际走通的是“Logo 留白、自动校验通过、首图保留”的一条路径。对 uncertain、质量提示、旧 retryRecommended、校验异常和两次独立运行的保护由已有 20 项离线回归覆盖；不能用这个单个真实样本证明所有模型误判已被消除。模型将品牌语气标为 matched 也不替代人工判断。

## 费用

生图按目录价 0.60 元；校验实际 usage 为输入 2101 tokens（图像 1402、文本 699）、输出 270 tokens，按北京档输入 2 元/百万、输出 12 元/百万计算为 0.007442 元，合计 **约 0.607442 元**。低于已批准的 2 元预算；执行器预留 1.161152 元。

金额是实际 usage 与已核验目录价的核算值，不冒充账户最终出账金额。价格依据及离线门禁结果见 [本轮预演与费用方案](./validation-policy-controlled-preflight.md)。校验关闭思考且限制输出 4096 tokens，仅限本轮执行器，没有修改生产设置、分析 Prompt 或模型配置。

## 首次生成图片

![本轮唯一首图，人工质量待审核](E:/image-quality-regression-evidence/validation-policy-controlled/runs/a3e5d606-d0ba-466b-b8b3-9449800e5011/workflow/runs/30a280c6-b194-4082-b502-adf60370c651/images/output.png)

图像 SHA-256：`2ddf1b812a990d9fe52e5fc149ccd5db0917f9425bb6ce615fe73e12c1de1dd1`。图片可供人工审阅，本报告不作质量恢复或优于历史图的结论，不据本轮图像追加设计规则。

## 证据与隔离

完整本地目录：`E:/image-quality-regression-evidence/validation-policy-controlled/runs/a3e5d606-d0ba-466b-b8b3-9449800e5011/`。

- `final-prompt.txt`、`compilation-evidence.json`：最终 Prompt、正式任务和编译身份。
- `image-request-1.json`：实际生图请求体和 Prompt 摘要，不含凭据头。
- `validation-request-1.json`、`validation-response-1.json`：唯一校验请求与原始返回；只在仓库外保存。
- `model-calls.json`：模型身份、发送/返回时间、HTTP 状态、usage 和费用预留。
- `generation-result.json`、`summary.json`：首图、自动状态、调用数、耗时、人工验收待审核状态。
- `flow-verification.json`：离线逐项复核结果、图像与请求摘要、目录价核算值。
- `original-project-inventory.before.json`、`original-project-inventory.after.json`：源项目只读保护证据。
- `workflow/`：独立测试运行的 Prompt、run、图像和分阶段校验报告及摘要。

workflow 内含一次性复制的本地加密凭据，不能整体上传或提交。仓库仅保留本报告和经授权的摘要审计；未提交 Provider 原始响应、图片、项目数据或凭据。

实现保持审查过的四项哈希；仅完整性 manifest 的四项对应值按授权更新，见 [更新审计](./validation-policy-integrity-update.json)。创意策划、视觉迁移、公共宿主、Golden、分析 Prompt 均未修改。离线 repo:check 已完整通过，额外宿主测试既有 256 != 236 断言仍按预演报告单列，不扩大本次工作。

当前停止真实调用和质量修改，等待用户的下一阶段空间视觉质量修复指令。本次自动 passed 不构成人工质量冻结，也不改变此前“两图均未达历史人工验收基准”的结论。

调用后再次执行 `npm run repo:verify`：完整通过，退出码 0；含独立完整性、双向隔离、current-flows 与 56 项守卫测试。日志：`E:/image-quality-regression-evidence/validation-policy-controlled/post-run-repo-verify.log`。未进行任何额外模型调用。
