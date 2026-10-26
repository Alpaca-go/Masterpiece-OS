# RKS-02E1C · 冯烫烫正式分析输入冻结与执行授权预检

结论：**离线请求冻结完成，实验侧接线审查完成；等待用户明确授权，尚未执行真实分析。**

来源分支 `codex/rks-ftt-two-dispatch-guard`；起点 HEAD 精确等于 `3d7fe3b8355266ce84a175fb61a3b53fbb37e360`。本交付仅新增实验工具及报告，没有修改生产实现、Prompt、Compiler、Golden、完整性记录或 RKS 知识状态。

## 1. 项目和素材

| 核对项 | 实测 |
| --- | --- |
| 隔离项目 | `d9ccf5c1-10f3-4c43-b0a7-cd64b62f4627` |
| 名称 / 行业 | 冯烫烫 / 餐饮服务 / 四川特色小吃 / 跷脚牛肉 |
| 状态 / 分析上下文 / 确认方向 | `ready / missing / missing` |
| ProjectRecord SHA256 | `e9a21e3bfabf1c4a6989a804cecc223fe5701fac7d05247bb65bd1ad74962bfc` |
| 监护器 intake SHA256 | `37b74fca3fd07a7d17b745aa157d84109605aa1bd6cba69b0a4aa8d65e4e6e31` |
| 当前身份指纹 | `45d2670a50457dacff77a465c61a8efe231e183e9aa4b46637ef789a95a8eab7` |
| 原始素材 | 10 张，逐张与 E1A 素材清单、ProjectRecord 及磁盘字节一致 |
| 原用户项目 | `3b5b03c0-915a-41aa-9c54-4ffaa166ab88`，46 文件逐项一致；树摘要 `e4c417097b951eed3cac0d2a27e29748a43fa471f8b7b87812ecc31cfbe2acaf` |

身份指纹仅说明当前 intake 身份，不能代表分析完成。全部原图路径和完整 SHA256 在 [freeze-manifest.json](freeze-manifest.json) 的 `project.materials`；源/目标对照沿用 E1A 的 [material-sha256.json](../ftt-analysis-preparation/material-sha256.json)。项目记录和 input 文件未改动。隔离项目仅增加离线预处理总览图及 `visual-inventory.json`，具体字节记录见 `localPreparationFiles`；未创建 report、Run、Packet 或方向确认记录。

## 2. DCD / UVU 精确冻结

| 阶段 | Messages SHA256（编码前） | Provider Body SHA256 |
| --- | --- | --- |
| DCD | `7494e9b2a4853b16bb92cdcdc2c5a152fd9a2303d7b027adda61ec2466dc4b4a` | `046cdbbaa9d94ff12b7cffbff964c44c9ddb3808377e595d02915703fac05809` |
| UVU | `ac2ed144a90bf8738aa30cb2d8bb7044f639e68cf1b8d30df198adf35dd0ff76` | `6ef41ecd7a847eb92e9d226829f1b02923a3980d51f3dd631e4f573a261f8d7c` |

- [dcd-request.json](dcd-request.json)：完整 system/user 文本、6 个源附件和 6 份实际 JPEG 上传字节的 SHA256、尺寸与字节数；正文 955,619 字节。
- [uvu-request.json](uvu-request.json)：完整 system/user 文本、10 个原图附件和 10 份实际 JPEG 上传字节的 SHA256、尺寸与字节数；正文 1,987,049 字节。
- [attachment-proof.md](attachment-proof.md)：原图和两阶段实际上传字节的完整摘要表，便于逐项审阅。
- [source-manifest.json](source-manifest.json)：生产依赖、独立 Prompt、编码器、监护器、实验接线及根 lockfile 的逐文件 SHA256，以及 Node/sharp/libvips 环境。
- [execution-policy.json](execution-policy.json)：监护器需要的两阶段 pin、项目输入、固定会话、固定原 E1B ledgerRoot、模型/URL 和计费依据。

先使用 E1B 的 `freezeStage`；再以原 `createQwenReasoner` 编码器进行第二次仅拦截捕获，读取其实际 `data:image/jpeg;base64,...` 字节。没有返回模型结果。DCD 为总览图 + `asset-001/003/006/008/010` 五个优先细节源图；这些 asset 编号按正式 inventory 排序，具体原图 UUID 看 `sourcePath`。现有预处理没有额外裁切细节文件，细节附件就是这五个原图，实际上传时再转 JPEG。

两阶段共 16 个上传项，11 份唯一 JPEG 字节（5 个细节跨阶段重复）。原编码器原样执行自动方向、长边不超过 1600、白底 flatten、JPEG quality 82/mozjpeg；没有自行换算法。未遗漏总览图、细节图或上传优化副本。

Body SHA256 是对 `JSON.stringify(originalEncoderBody)` 的 UTF-8 字节计算，保留键和附件顺序。`messagesSha256` 是编码前 messages；`encodedMessagesSha256` 是含图片 data URL 和附件标签的编码后 messages，二者区分记录。上传 JPEG 仅保存在 ignored 的 `.codex-smoke/rks-02e1c/uploads/`；不提交 Base64 或大图。报告的 `bodyProjection` 保留全部正文结构和文本，用有序上传证明可重建精确正文。[offline-audit.json](offline-audit.json) 已核对两阶段重建后的 Body/Messages SHA256 与字节数。

保留原请求中的项目描述和 DCD `Project Input.projectName=项目目录 UUID`，品牌字段仍为冯烫烫；这是固定生产 builder 的真实行为，不为预检改写。UVU 使用 Pipeline 开始时的 intake 快照和固定非空项目名，不注入 DCD 响应，因此可独立离线冻结。

## 3–6. 执行、费用、授权与后续流程

3. [唯一执行器接线审查](execution-review.md)；只暴露显式授权后的单次入口，本轮未调用。
4. [模型及费用风险](model-and-cost-review.md)及[机器可读预算](cost-budget.json)；两阶段各规划 32K 输入，不改变 API 参数，不提供人民币绝对封顶保证。
5. [最终用户授权文本](authorization.md)；文件和 JSON 均为待批准模板，不是已获授权。
6. [分析成功后的 saveDraft → confirm → capture → 正式 Prompt 冻结](post-analysis-freeze.md)；本轮均未执行。

固定会话：`rks-02e1c-ftt-3d7fe3b8-once`。固定账本：`E:\Masterpiece-OS-Main-Publish-20261015-Verified\.codex-smoke\rks-02e1b\real-analysis-budget`，本轮没有创建。

Policy SHA256：`19d5cfacf6f1b839cad4e0be80b68cc7019f32db64244c8a93faac54b0182fc6`。
Source manifest 文件 SHA256：`a27a7649f3106ac1da0014a365c4182e58c7360b6a6d5d5010d0b321b205db12`。

## 验证与停止点

E1B 监护器/正式编排集成/原生单次传输：52/52 离线测试通过。集成测试只用临时合成项目；它们不是真实冯烫烫成功证据。新执行器在缺失授权及传入未批准模板时均拒绝，未写项目或账本。两次独立编码捕获摘要一致，正文重建通过。

仓库闸门结果见 [repo-verification.txt](repo-verification.txt)，最终机器检查见 [validation.json](validation.json)。首次 repo:verify 在新文件注释中的英文“依赖注入”用词触发项目规则扫描；只改写该注释后重跑，没有改检查器或生产规则。

本轮真实 Provider 派发、真实分析、生图、模型校验、自动重试均为 **0**，未读取、解密或写入真实凭据。只访问公开官方文档核对费率。没有 merge、部署、发布或创建真实分析成功记录。**到此停止，等待用户明确授权。**
