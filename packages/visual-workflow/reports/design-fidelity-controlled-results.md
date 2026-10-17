# 九州美学受控真实生图结果

本次按用户最终回复“批准”执行，**唯一一次真实生图成功，结果等待人工视觉审查**。没有模型验图、自动纠正或重生成，不声明视觉质量恢复。

## 原始图片与运行证据

证据目录：`E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/executions/ce3d7e64-dcf5-4e6c-bc4e-5c99372a7db7`。

- [Provider 原始高清 JPEG](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/executions/ce3d7e64-dcf5-4e6c-bc4e-5c99372a7db7/provider-original.jpeg)：2816×1584，448,416 字节，直接解码返回的 b64_json 保存，没有重编码、放大或后期编辑。SHA-256 `80a5916f915eb8be7d510622b5f45d6834426fe460033093abbd24bd264a3f11`。
- [标准工作流 PNG 输出](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/executions/ce3d7e64-dcf5-4e6c-bc4e-5c99372a7db7/workflow/runs/a0e6e463-7aea-4864-96d7-a489c43cd159/images/output.png)：原有 image service 自动写出的 PNG，原始返回 JPEG 另外保留。
- [运行摘要](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/executions/ce3d7e64-dcf5-4e6c-bc4e-5c99372a7db7/summary.json)、[实际请求与预算占用](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/executions/ce3d7e64-dcf5-4e6c-bc4e-5c99372a7db7/request-attempt.json)、[Provider 返回元数据](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/executions/ce3d7e64-dcf5-4e6c-bc4e-5c99372a7db7/provider-response-metadata.json)。不保存鉴权头，响应元数据没有图片 base64 或密钥。

| 项目 | 实际结果 |
|---|---|
| 分支 / 源码提交 | `fix/visual-workflow-image-quality-regression` / `78838062c9cd6c985aa3314d3a464939d5ef2098` |
| 独立任务 ID | `d9287f98-01ce-419c-ab01-7e4f04b70f4d` |
| 真实 run ID | `a0e6e463-7aea-4864-96d7-a489c43cd159` |
| Provider / 模型 | volcengine / `doubao-seedream-5-0-pro-260628` |
| 请求 | POST `https://ark.cn-beijing.volces.com/api/v3/images/generations` |
| 场景 / 镜头 / 路线 | reception / entrance_view / standard |
| 构图 / 尺寸 / 返回格式 | 16:9 横向 / 2K / b64_json，watermark=false |
| 开始 / 完成（UTC） | 2026-10-17 01:49:40.130 / 01:50:57.774 |
| 总运行耗时（含本地准备与保存） | 77.644 秒 |
| HTTP / 输出 | 200 / 1 张 |
| Provider usage | input_images=0，generated_images=1，output_tokens=17424，total_tokens=17424 |
| 真实生图 / 模型验图 | **1 / 0** |
| 自动纠正 / 重生成 / 重试 | **0 / 0 / 0** |
| 请求预算占用 / 上限 | **¥0.60 / ¥0.60** |
| 预计本次费用 | ¥0.60；沿用预检官方单图价格，没有查询账户账单，不能冒充已核实扣费 |

调用权限在发送前以独占文件锁和请求记录消耗；后续模型请求全部拒绝，包括失败后重试。执行的是预检批准的原有 `createShortChainGenerationService.start` 标准生图部分，没有调用追加验图的 `startValidated`。标准编译、生成前门禁、image service 与适配器均未修改。不将本次记录表述为公开带验图入口的完整真实 E2E。

## Prompt 与来源保真

实际任务、离线审核任务使用相同用户定位：

> 九州美学是具有艺术展馆空间气质的高端医美机构，艺术表达、建筑、材料与空间体验需要整体协调，同时保留真实的接待、咨询、隐私与医疗运营功能。

该定位只通过测试任务的 `currentInstruction` 传入；原 Packet 未改动。

- [本次正式编译完整 Prompt](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/executions/ce3d7e64-dcf5-4e6c-bc4e-5c99372a7db7/final-prompt.txt)：7,793 Unicode 字符，SHA-256 `108dd9aacf66ad53b76056d23e82b20b35b4ee7c06987399dfb1ef63def18761`。
- [Provider 完整 Prompt](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/provider-prompt.txt)：含原有适配器前缀，共 7,896 字符，SHA-256 `c003baed2bce4bd448cb5357e1f04db033e6813e117f6359127ca9b2ea294d1b`；已与实际 POST body 逐字段比较。
- [实际完整编译产物](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/executions/ce3d7e64-dcf5-4e6c-bc4e-5c99372a7db7/compilation-evidence.json)、[完整来源追踪](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/executions/ce3d7e64-dcf5-4e6c-bc4e-5c99372a7db7/source-trace.json)。

正式编译结果、生成入口、实际 POST 与批准预检一致。softBudgetExceeded=true：7,793 超过 7,500 质量软预算，未截断或修改预算；适配器前缀后仍低于现行 12,000 硬限制。

## 与最初三张人工验收图的对照

[四图并排对照 HTML](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/executions/ce3d7e64-dcf5-4e6c-bc4e-5c99372a7db7/visual-comparison.html) 和 [完整图片 Markdown](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/executions/ce3d7e64-dcf5-4e6c-bc4e-5c99372a7db7/visual-comparison.md) 保留原比例，无裁切、调色或像素编辑。历史三图哈希复核一致，仅用于此处人工比较，没有发送给 Provider。

以下是对当前四张图片的可见观察，**不是项目原始资料、模型验图结论或新的生产规则**：

| 维度 | 本次可见结果与待审问题 |
|---|---|
| 艺术装置构图层级 | 大型羽状装置位于接待台后方主要视域，已成为显著视觉焦点；是否达到用户所需艺术性仍待审 |
| 建筑与装置协调 | 本次墙顶连续曲线、拱形开口的分量较大；历史三图建筑基底相对克制，通透装置与自然光关系更突出 |
| 色彩作用范围 | 本次紫色在装置外还进入背景弧墙、纱帘及家具，整体铺陈比三张历史图明显；是否符合用户意图待人工判断 |
| 材质光学 | 本次局部具有透光层叠外观，但透明感、边缘层次和历史图中的细腻程度存在可见差异；仅凭渲染不能确认实际材质和工艺 |
| 接待与等候 | 可见前台、设备和等候座位；未见工作人员或服务过程，不能据此证明真实运营充分成立 |
| 跨场景与隐私 | 没有明显治疗设备或治疗区内部；右侧开口后可见座椅，用途未知。纱帘不能证明咨询的视觉与声学隐私达标，单张透视图无法验证完整动线 |
| Logo 保真 | 前台出现模型生成图形，尚未执行原 Logo 后合成，不作品牌标识验收；未自动修图 |

本次不能仅凭装置进入焦点或工程门禁通过就宣称质量恢复。艺术展馆空间气质、运营关系、材料与建筑整体协调是否满足要求，由用户审核本图决定。

## 隔离与保护记录

原项目 46 个文件与预检清单一致，执行前后哈希一致：[前](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/executions/ce3d7e64-dcf5-4e6c-bc4e-5c99372a7db7/original-project-inventory.before.json)、[后](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/executions/ce3d7e64-dcf5-4e6c-bc4e-5c99372a7db7/original-project-inventory.after.json)。只在新测试记录中生成，没有覆盖原项目或历史作品。

执行前完整性校验通过，implementationDigest `6bb6c099b5120c7a5209e8048dc4bd3f4dde115b04e6fb3ab4aeff3ea456f71d`，质量记录仍为 `pending-separate-quality-repair`。本次没有生产代码、共享实现、完整性摘要、Golden 或人工验收状态修改。运行摘要中的 pending_human_review 只描述本次新测试记录。

本轮 `npm run repo:verify` **PASS，退出码 0**，包含双向隔离、current-flows 和治理反例测试；详见 [完整日志](E:/image-quality-regression-evidence/design-fidelity-controlled/fe2d2e89-b09b-45e6-905d-f668a6a25d64/executions/ce3d7e64-dcf5-4e6c-bc4e-5c99372a7db7/repo-verify.log)。执行后再次校验实现完整性通过，`git diff --check` 通过，工作区仅新增本次预检与结果两份报告。此前全部离线回归及 Golden 结果仍见[门禁恢复报告](./cross-zone-gate-recovery-review.md)；本轮无生产行为变更，未重新执行 Golden，也不刷新任何基准。

真实调用已停止。没有合并、发布或冻结质量；等待人工审查。
