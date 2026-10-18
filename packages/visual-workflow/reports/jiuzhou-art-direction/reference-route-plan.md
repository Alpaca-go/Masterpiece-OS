# 独立参考输入可行性与最小接入方案

本文件是待审核方案，**不是已实现的运行能力**。离线工具位于独立包 `tests/`，未被生产导入，没有执行接口、凭据读取或网络传输。本轮不修改 `VISUAL_WORKFLOW_STANDARD_ONLY`。

## 三层能力核对

| 层次 | 证据 | 结论 |
|---|---|---|
| Provider | [Seedream 官方图像 API](https://docs.volcengine.com/docs/ark/image-generation-api?lang=en)说明 Pro 支持最多 10 张输入，`image` 接受 URL 或 Base64；单图 30MB、总像素不超过 3600 万 | 四张附件在官方公开限制内；未实测服务接收 |
| 独立多模型适配器 | `src/image-adapter/multi-model.js` 的 Seedream `maxReferences=10`，`buildSeedreamRequest()` 构造 `body.image` 为 data URI 数组 | 四图离线构造和解码哈希回验通过，未执行 `execute()` |
| 独立短链编译/服务 | `generation/seedream-adapter.js` 仍宣告 `maxReferenceImages=2`；`service.js` 和 `image-service.js` 拒绝非 standard/非空 refs；实际图片执行输入固定 `references: []` | 能力声明不一致且正式路线关闭，不能凭适配器支持就声称业务支持 |

参考强度与角色控制参数在现有能力记录中均未验证。不能编造 `ref_strength`、`ref_mode` 或权重。既有 `reference_first` 为高保真视觉世界参考语义，与四张图分属性艺术指导并不等价；不能简单替换模式名或把未知场景标成同场景来通过门禁。

## 待实施契约与文件

所有业务改动限定 `packages/visual-workflow/`；不复用共享规划/迁移实现，不向其他项目注入本项目文案。

| 位置 | 具体入参/行为要求 |
|---|---|
| `src/project-store.js` 或独立所属资产模块 | 显式注册图片角色 `approved_art_direction_reference` / `rejected_comparison`，绑定独立项目 ID、授权来源、原始 SHA-256、MIME、大小、像素与不透明资产 ID。不可把认可图冒充原始分析素材，也不把 Logo 作为风格参考 |
| `src/service.js` | 新增显式可选模式 `art_direction_reference`（候选语义名），同时要求项目确认记录和非空 `referenceAssetIds`。保留标准分支的空参考约束与现有完整性/项目/凭据所有权检查；不得缺省启用、隐式回退或读取全局引用 |
| `generation/task-contract.js` | 明确新模式、已选引用及属性用途集合，去重并限制数量。标准任务非空引用、参考任务缺图、Logo 或负面角色均阻断。任务/快照须保存选择和摘要，不只保存文件名 |
| `generation/compile.js` 与独立空间门禁 | 定义艺术指导模式自身语义：四图属性目标、目标接待功能权限、单一艺术系统与 Logo 后合成。实际引用数进入质量与路线门禁；不能借用当前 `referenceCount:0` / 显式文字免参考规则表示参考路线已通过 |
| `generation/seedream-adapter.js` | 对目标模型统一能力记录与独立多模型适配器的数量上限，明确能力来源及未验证控制参数。变更需单独回归，不能把上限不一致悄然忽略 |
| `src/image-service.js` | 按项目资产 ID 解析真实受授权文件，检查真实路径/符号链接/穿越、格式、尺寸、大小和摘要，并在执行前再次验证快照绑定。只在新模式向 universal input 传非空 refs；标准输入仍为 `[]`，缺图禁止降级为文本生成 |
| 请求与运行记录 | 保存模式、模型、参考角色/顺序、原始与实际 payload 哈希、请求图数、Prompt 哈希、终态与调用计数。精确请求证据保留在本地，不提交凭据/原始 Provider 响应 |
| `short-chain-service.js` 与校验 | 不绕过可运行状态、编译完整性、目标场景、Prompt、Logo 与图像校验。受控尝试需把一次生图、一次必要校验与零自动重生成的计数/费用边界变成可验证请求限制；不能只在计划里写上限 |

引用记录应是用户主动导入的一次性项目副本，没有后台同步或全局素材回退。若文件、授权、项目、快照或模型能力改变，先失败关闭并重新提交预检。已确认 Logo 只参与后期合成，不加入图像条件；参考图内可见文字/水印由明确禁止复制的约束处理，不声称能保证模型遵守。

## 建议的四图选择

| 请求顺序 | 图片 | 仅授权的目标属性 |
|---|---|---|
| image[0] | approved-translucent-canopy.jpg | 首要建筑基准：大尺度轻薄半透明结构、透射日光、连续空间 |
| image[1] | approved-sculptural-ceiling.jpeg | 建筑和艺术融合：薄、轻、通透，层片与空间合成一个雕塑系统 |
| image[2] | approved-pearl-installation.jpeg | 材质与艺术尺度：珠光叠层、边缘高光、乳白反射和清晰深度 |
| image[3] | approved-gallery-entrance.png | 留白、自然光与配色克制；不授权复制所有装置和布局 |

四图同时输入在官方 10 张限制以内；不需要拼贴、裁剪或修改人工基准。若后续实际端点不接受四图，阻断并提交经过审查的选择清单，不静默丢弃图四或图五。失败图只用于离线人工负面对照，永不成为正向引用。

## 已验证与仍待验证

已验证：四图原文件哈希/大小和完整解码；真实 `body.image[]` 中的 Base64 与原图一致；标准 body 无 image；未授权、未确认、负面/Logo、跨项目、重复/缺失引用、哈希/格式/大小错误、路径穿越和父目录链接等反例均拒绝。

待验证：真实项目资产注册、快照/执行阶段绑定、业务模式贯通、统一能力声明、新模式下所有门禁、服务运行日志与成本限额。上述尚未接入生产，因此本轮不能标记参考图业务回归通过。即使未来接入并工程通过，四图的属性迁移效果仍须人工视觉验收。
