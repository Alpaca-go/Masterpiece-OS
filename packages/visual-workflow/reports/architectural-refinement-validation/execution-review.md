# 九州美学 P1—P4 定向精修：单张真实生图验证

执行日期：2026-10-19（Asia/Shanghai）。分支 `fix/jiuzhou-architectural-language`，代码基线 `89e909b65217f3edd45f05fedff204208a5bf708`，精修提交 `c1ace7ff1972178c113ded48728e8771c274185c`。

本轮使用最新 P1—P4 已确认方案，完成 **1 次真实 Seedream 生图，Qwen 0 次、其他模型 0 次、重试 0 次**。图片成功保存，未追加重生成或定向纠正。初步观察显示商业功能组织改善最清楚；艺术体量、精密薄片层级及主厅去长廊化仅有部分改善。**单张输出不代表稳定达标，也不是用户人工质量验收。**

## 最新图片与对照

![P1—P4 精修后真实生成](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/architectural-refinement/real-validation/authorized-execution/jiuzhou-standard-output.png)

[业务输出 PNG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/architectural-refinement/real-validation/authorized-execution/jiuzhou-standard-output.png) · [原始 Provider JPEG](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/architectural-refinement/real-validation/authorized-execution/jiuzhou-provider-original.jpg) · [上一轮真实输出](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/architectural-integration/paid-validation/authorized-execution/jiuzhou-standard-output.png)

图片文件保存在 Git 忽略目录，审查目录只记录脱敏证据及本地链接；没有将生成图、校准图或 Provider 原始响应加入 Git。

## 正式业务入口与授权边界

现有网页 `visual-workflow:generate` 调用 `startValidated`，生图成功后会执行校验，因此本轮没有使用它。

使用系统已有的 `createShortChainGenerationService.start` 单张生成入口。它本来就是 `startValidated` 执行初始生图所调用的正式业务方法，且保留确认一致性、上下文指纹、预检、单张数量、空间语义、路由 Gate A、实际 Prompt Gate B、参考解析、Provider Adapter、业务图片保存及会话历史。没有改动或替换这些生产实现，没有伪造校验通过，没有移除守卫。

派发前以相同 P1—P4 输入完成离线入口验证：实际生成链路记录模拟图像请求 1 次、已配置的模拟校验器调用 0 次。见 [仅生图入口证据](./generation-only-entry-proof.json)。正式编译仍通过独立工作流公共 `visual-workflow:compile`；生成使用上述已有 `start`，没有构造校验服务。

执行脚本位于忽略目录，只负责预算限制、摘要比对和取证。传输层只允许目标 Seedream 端点的一次 POST；派发前持久化调用台账，并以独占执行目录阻止重复启动。它拒绝其他模型地址、二次派发及重定向。没有自行构造模型 Prompt 或直接替代正式 Provider Adapter 请求。

新环境使用最新确认副本的一次性项目数据副本：`.codex-smoke/architectural-refinement/real-validation/user-data/visual-workflow/`。用户通过正规“独立模型设置”在本机重新保存 Seedream 配置后回复“已配置”；没有复制或读取后输出旧环境的 API Key。真实凭据只由原有独立加密存储和运行时在内存中使用，请求头不落盘。Qwen 无需配置或调用。

## 预检及实际请求核对

| 项目 | 核对结果 |
| --- | --- |
| 确认 SHA256 | `e905e28071be6b0e637f5adb8196aa43e40eaa9f2592893b21445683197475c7` |
| 正式 Prompt SHA256 | `0bee886af833d8ae7cbb6292fbf18fc294b06a62fa81536c1b5da37ed6ae2827` |
| Provider Prompt SHA256 | `37258f0a5bda45a0e92917e7347277ae284434c95f66864a2cafdb53858a4a6c` |
| 实际请求体 SHA256 | `5fb7a41e028b2225cdddabe86aff02f63affedcde60461477a34a3c2af0a0d7c` |
| 模型 / Provider / 协议 | `doubao-seedream-5-0-pro-260628` / `volcengine` / `seedream-image` |
| 图像参数 | 2K、16:9、接待主厅、单张 |
| 参考输入 | `generationBasis: standard`、`referenceAssetIds: []`、请求无 `image` 字段 |

确认记录、正式 Prompt、Provider Prompt 和实际请求体全部与精修审查基线精确一致，没有回退旧方案或临时编辑。所有四张校准图片均未进入图像输入。确认来源说明中的“本轮不授权真实生图”是之前离线轮次的历史边界，本次真实执行依据用户当前的独立明确授权，不改写历史确认记录。

[预检记录](./preflight-summary.json) · [实际请求核对](./request-comparison.json) · [实际请求体（无请求头）](./provider-request.json) · [原确认记录](../architectural-refinement/confirmed-direction.json) · [原正式 Prompt](../architectural-refinement/formal-prompt.txt)

## 执行结果、图片与费用

- Provider HTTP 200；模型请求耗时 112.007 秒，业务全程约 113.406 秒。
- Provider 返回原始 JPEG：2816×1584，245868 字节，SHA256 `184d6d296967e0189ffdf50d3abe1babab7c0e06e197eb544955fa66726fc1b7`。
- 标准业务 PNG：2816×1584，2609413 字节，SHA256 `48b98f7a49c4320deec4fbbd1314d2ccd5f47a3ba88ea3b0f19b0cef56f41d9f`。
- JPEG 与业务 PNG 解码后的像素摘要完全一致；只经过既有图片服务的 PNG 转存，没有图像编辑或标识合成。精确比例为 16:9。
- Provider usage：输入图片 0、生成图片 1、输出/总 Token 17424。API 没有返回实际货币结算金额；本轮没有查询账单或将历史报价当成当前实际费用。可计费模型派发总数为 1。
- Qwen 校验、其他模型、自动重试、重生成、定向纠正均为 0。业务结果为 `succeeded`，不等于已校验或人工验收通过；标识合成也未执行。

[执行摘要](./execution-summary.json) · [调用台账](./call-ledger.json) · [响应摘要](./image-response-summary.json) · [图片完整性](./image-integrity.json) · [费用信息](./fee-record.json)

## P1—P4 初步目视观察

以下是对两张真实输出的代理观察，不是新增模型评价、用户验收、建筑测量或镜头参数认证。生成随机性未被隔离，不能把单张差异当成项目字段的因果证明。

| 问题 | 相比上一轮可见的改善 | 仍然存在或无法证明 |
| --- | --- | --- |
| P1 艺术结构尺度 | 右下层片之间及候客后方出现更多可读间隙，候客组不再沿一整面厚重艺术墙线性排布；侧向至上部的建筑艺术连续关系仍在 | 上部及右侧大曲面仍占画面较大比例；左右近景均出现裁切层片，艺术系统仍强烈包围并主导取景。不能判定体量问题已解决 |
| P2 层片精致度 | 薄边、交叠轮廓、半透明边界和局部弱紫虹彩更可辨，局部可以透见后方座椅及界面 | 主体仍是宽大的平滑曲面，中尺度过渡与局部精密薄片尚未清楚分化；前景半圆收边偏大型透明隔片，精密层叠深度没有充分成立 |
| P3 商业功能组织 | 弧形沙发、单椅、小桌及后侧座席形成成组交流关系，组团周边留出通行；前台两名员工、工作台及前侧服务面使服务用途更清楚；背景由树景拱口变为室内退让递进 | 后续入口是否确实对应咨询及运营、是否完整保护隐私、员工通路是否合理，不能由这一张图证实；深处仍有多重对齐门框的纵向收束 |
| P4 横向主厅 | 接待与较舒展的候客组共同占据横向展开的前中景，开放地面比之前更明确；未见明显桶形畸变 | 中央通路和重复背景框口仍将视线引向长轴，两侧近景层片继续产生通道框景，艺术长廊感尚未完全消失；真实宽度与镜头焦距不可由单图确认 |

暖白、乳白、浅暖灰背景、中性软装、珠光半透明与局部弱紫虹彩、安静明亮的美术馆气质基本保留。竖向上部采光与连续曲面的关系也保留。定向日照和明显地面、家具阴影仍存在，尚未充分呈现原目标的柔和漫射自然光。

因此，P3 的可见改善最明确；P1、P2、P4 为部分改善并伴有上述保留意见。没有为获得更好结果继续修改设计、调用 Qwen 或生成第二张。[逐项观察数据](./visual-comparison.json)

## 只读保护与工程检查

正式九州项目、历史测试副本、历史真实输出、原 P1—P4 确认副本和审查目录共 7 个保护根的完整文件清单前后相同。业务实现、共享宿主、路由、传输、依赖、其他独立业务、Golden、实现完整性记录及人工视觉质量状态均未修改。[范围及只读证明](./readonly-and-scope-proof.json)

Provider 原始响应、图片和本机执行脚本只保存在忽略目录；入库候选仅为本目录脱敏报告和摘要。[本地产物索引](./local-artifact-index.json)。离线 `repo:verify` 与文件政策检查结果见 [工程检查](./gate-results.json)；它们不会调用模型，也不代表视觉质量通过。

## 停止状态

本轮唯一一次生图授权已使用，执行进程已退出。未执行 Qwen 校验、第二次生图、重试、定向纠正、质量状态更新、合并、部署或发布。

当前输出等待用户人工视觉审核；不宣布 P1—P4 全部解决或质量稳定达标。
