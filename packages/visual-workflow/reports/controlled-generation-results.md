# 独立九州美学：真实 Provider 测试结果

状态：**等待用户人工视觉验收**。本报告不宣布质量恢复，不建立人工质量冻结，不修改验收状态，不合并或发布。

## 本轮运行

| 项目 | 结果 |
| --- | --- |
| 测试记录 ID | `d1d0042d-952f-4d04-8e13-4a78de32e0f4` |
| 源项目 ID | `ecfcdf23-a81d-4cd2-8250-74ecd221b7fb` |
| 时间（北京时间） | 2026-10-16 18:36:36–18:39:08 |
| 总耗时 | 151.31 秒 |
| 生图模型 | volcengine / `doubao-seedream-5-0-pro-260628` |
| 校验模型 | dashscope / `qwen3.6-plus` |
| 固定任务 | 标准生图、接待区、入口视角、16:9、2K、每次单张、零参考图 |
| 输出尺寸 | 两张均为 2816×1584 |
| 实际模型调用 | 生图 2 次，校验 2 次；达到已批准上限后停止 |
| 定向纠正 | 1 次，由现有验证器触发；随机重试 0 次 |
| 校验限制 | 仅本次测试请求 enable_thinking=false、max_tokens=4096；生产实现和保存配置未改 |
| 自动流程终态 | `passed`，仅指既有自动交付校验 |
| 人工视觉质量状态 | 待用户确认 |
| Logo 合成 | 未执行；两图均为待后期合成的留白版本 |
| 原项目保护 | 全部文件前后逐项 SHA-256 相同 |

通过当前工作空间的只读模型目录 API，确认 Qwen 模型为 aliyun-bailian 提供的 qwen3.6-plus，输入不超过 256K 的端点目录价为输入 2 元/百万 tokens、输出 12 元/百万 tokens。该域名是北京工作空间接入域名；没有为测试切换端点。生图价按火山方舟 2K 档每张 0.60 元核算。

首轮校验输入 1915、输出 243 tokens；纠正图校验输入 1918、输出 187 tokens。按目录价计算，生图 1.20 元、校验 0.012826 元，合计 **约 1.212826 元**，低于授权 5 元。它是用量和目录价核算值，不冒充已出账金额；优惠及最终扣费以账户账单为准。测试执行器保守预留金额为 2.322304 元，与实际目录价核算值含义不同。

## 两张新输出

首图 runId：`a82b5488-8ee1-4810-9151-916899c3341d`；Provider 生图成功，首次自动校验 failed。

![首图](E:/image-quality-regression-evidence/controlled-runs/d1d0042d-952f-4d04-8e13-4a78de32e0f4/workflow/runs/a82b5488-8ee1-4810-9151-916899c3341d/images/output.png)

定向纠正 runId：`18752c3d-2155-43a9-a8db-f8c4df5d2f17`；Provider 生图成功，二次自动校验 passed。

![定向纠正图](E:/image-quality-regression-evidence/controlled-runs/d1d0042d-952f-4d04-8e13-4a78de32e0f4/workflow/runs/18752c3d-2155-43a9-a8db-f8c4df5d2f17/images/output.png)

两图 SHA-256 分别为：

- `df8a110bc67c99aeff923303f898994b50b9f925c09bb8e1f4c100f6b03357af`
- `f9eb3ae41adab47dfe69576fdbd2aa4353971836429b1f55299e22cb49598d7b`

## 自动校验与观察到的限制

首轮验证把“没有可见 Logo/字体用于确认锁定资产”列为 locked_asset_violation，触发一次定向纠正。任务实际使用 post_composite，要求模型留白后再合成确认 Logo，故存在校验与合成合同冲突的候选问题。纠正图也没有 Logo，第二次验证却没有列出该资产违规，说明两次模型判断不一致。本轮如实保留所有响应，没有为了变绿修改校验器或基准，也没有超额调用。这个候选问题应另行审查，不在本轮擅自扩大已批准的六项生产修改。

从输出可见：首图装置仍偏墙面浮雕；纠正图出现独立主体，但紫色、发光线条和重复曲线依然明显。它们与人工基准的半透明珠光、暖白主导、克制浅紫及空间主次仍需人工比对，不能用出现羽毛或模型返回 matched/passed 就判定质量恢复。

Logo 未合成，不能宣称完整品牌交付已完成。没有凭空放置或生成中文品牌名。新图与六张原样图的输入、随机因素不完全可控，不作逐像素或严格同实验因果结论。

## 完整本地证据

[新图、当前回归图与人工基准的完整对照](E:/image-quality-regression-evidence/controlled-runs/d1d0042d-952f-4d04-8e13-4a78de32e0f4/visual-review.md)

本轮目录：`E:/image-quality-regression-evidence/controlled-runs/d1d0042d-952f-4d04-8e13-4a78de32e0f4/`。

- `summary.json`：终态、调用数、耗时、原项目未变、人工验收状态。
- `model-calls.json`：每次发送与返回时间、HTTP 状态、模型身份、usage、预算预留。
- `image-request-1.json`、`image-request-2.json`：实际完整 Prompt 与请求体，不含凭据头；初次 Prompt 与获准离线预演逐字一致，纠正 Prompt 也保留品牌装置原句。
- `validation-request-*.json`、`validation-response-*.json`：实际校验参数、输入和结果；只保存在本地，不提交原始 Provider 响应。
- `pricing-verification.json`：从当前模型目录提取的价格依据。
- `implementation.json`、`compilation-evidence.json`：完整性身份、正式编译任务、Prompt 摘要。
- `original-project-inventory.before.json`、`original-project-inventory.after.json`：原项目逐文件保护证据。
- `output-index.json`：图像位置、尺寸和 SHA-256。
- `workflow/`：独立业务入口产生的编译产物、run.json、trace、Prompt、上下文快照、验证及图片。

执行器位于仓库外 `E:/image-quality-regression-evidence/run-controlled-generation.mjs`。它创建全新的独立存储，只一次性复制现有独立设置、选定凭据、输入和分析上下文，生产业务入口仍执行完整性和编译门禁。没有读取或调用创意策划/视觉迁移配置、项目或业务实现。

本地测试 workflow 内包含加密凭据，不应整体上传或提交；仓库只保留本报告和已授权的摘要审计。全部新图与运行产物保持在独立测试目录，未覆盖原项目、历史生成结果或人工验收图片。

程序验证沿用 [受控更新与离线预演报告](./controlled-generation-preflight.md)：repo:check 完整串行通过；宿主通道数 256 != 236 的基点既有失败单列。本轮没有新增生产实现变化，也没有更新 Prompt、Golden、质量验收字段或兼容字段。

现在停止生成和修改，等待用户对两张图的人工验收意见。
