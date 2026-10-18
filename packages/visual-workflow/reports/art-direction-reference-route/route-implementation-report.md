# 独立艺术指导参考图路线：代码与离线验证交付

日期：2026-10-18。基于已审核提交 `eace535`，工作分支 `fix/visual-workflow-image-quality-regression`。

**正式应用服务路线已实施，离线业务集成通过；公共操作入口仍被原完整性记录阻断。** 本轮未刷新摘要、未调用真实模型、未上传图片、未合并、未发布、未覆盖人工验收。九州美学质量状态仍为人工不通过／待后续人工验收。

## 交付索引

| 内容 | 证据 |
|---|---|
| 完整正式 Prompt | [formal-prompt.txt](./formal-prompt.txt)，8425 字符，SHA-256 `63fdcaa3d6f5ec98106fe7d6029231bb5f6a66b74fc7b4256bf0718739438604` |
| 实际业务请求的 Provider Prompt | [provider-prompt.txt](./provider-prompt.txt)，包含既有适配器包裹，完整编译 Prompt 原文作为尾部传入 |
| 明确的四图选择、职责与排除项 | [reference-selection.json](./reference-selection.json) |
| 测试副本中的正式资产注册记录 | [registered-assets.json](./registered-assets.json) |
| 任务与执行快照 | [task-contract.json](./task-contract.json) |
| 生产图像服务写出的请求证据 | [request-evidence.json](./request-evidence.json) |
| 实际业务请求的脱敏评审副本 | [business-request-review.json](./business-request-review.json) |
| 实际生产与测试代码差异 | [code.diff](./code.diff)，相对于 `eace535`；先前确认接线保留 |
| 三行业与已审核实现的逐字对照 | [standard-parity.json](./standard-parity.json) |
| 原项目与附件逐文件只读证明 | [readonly-proof.json](./readonly-proof.json) |
| 测试矩阵与原始日志位置 | [test-results.json](./test-results.json) |
| 最终 SHA-256 差异及更新申请 | [integrity-update-request.json](./integrity-update-request.json)，**未应用** |

精确含 Base64 的请求保存在本地忽略目录 [business-request.json](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/art-direction-reference-route/approved-route-evidence/business-request.json)，不是已发送的请求，不提交凭据头或 Provider 原始响应。仓库内评审副本省略 Base64，明确标记 `redactedReviewOnly`，不能直接用于调用。

## 正式业务链路与权限

保留已完成的 `applyUserConfirmedVisualDecision` 空间接线；本轮进一步由正式 `createShortChainGenerationService.compile()` 加载项目的 `project-context/user-confirmed-visual-decision.json`。艺术指导模式缺失、损坏或过期的记录均阻断，不吞掉错误后回退旧 Packet。项目指导不是在测试工具中预先替换 Packet 后再声称服务已加载。

实际链路为：

1. 独立项目主动注册批准的图像和确认记录，保存在自己的 `project-context/art-direction/`；不加入原始分析素材，不修改项目已完成分析状态，不后台同步。
2. 正式编译服务按显式顺序加载资产并检查授权、项目、角色、文件与 SHA-256，绑定模型、注册表摘要、确认记录摘要和每项资产的执行快照。
3. 编译器先应用用户确认空间决策，再经过源适配、语义校验、目标场景权限、质量、预算、模式和路线门禁；在 Prompt 中逐项写出参考职责。图像引用数为真实选择数量，艺术指导模式不使用标准模式的文字免参考规则。
4. `start()` 重新读取确认和注册记录、复验文件和快照。过期输入失败关闭，不自动重编译成另一套指导；禁止直接编辑已编译的艺术指导 Prompt。
5. `createImageService.startCompiledCreativeTask()` 再次核对当前独立模型协议、任务和编译产物、图片顺序/角色/哈希及原始文件；由此构建实际 `references`。适配器的 `execute()` 产生含真实图片字节的 `body.image[]`，并持久化逐项请求摘要。
6. `startValidated()` 保留一次初始生成、一次校验、零自动重生成、首图留存和人工复核状态。艺术指导模式的校验读取同一份确认记录，避免用历史 Packet 的色彩/气质提案评判新方向；Logo 仍后期合成。

模型、Prompt、确认记录、注册表、资产顺序、哈希或项目发生变化，均须重新编译并经过原门禁。重复引用、缺图、角色错误、跨项目、授权撤销、格式/尺寸错误、路径穿越、目录链接及被篡改的文件阻断，不静默截断、补图或降级为文字生成。

本轮生产差异仅位于 `packages/visual-workflow/src/`：修改 17 个既有文件，增加 3 个语义模块。新增模块为 `art-direction-contract.js`、`art-direction-store.js`、`image-adapter/reference-capability.js`。共享实现、创意策划、视觉迁移、公共宿主、Web UI、依赖和根 lockfile 均未修改。新增代码名称无版本或迭代后缀；既有兼容名称保持。

## 显式调用契约

不新增公共宿主通道。沿用独立 `visual-workflow:import-files`，只有参数显式包含 `purpose: 'art_direction'` 时才进入艺术指导资产注册；普通文件数组仍走原素材导入。

- 注册输入：项目 ID、`authorization`（confirmed、来源、原文 SHA-256）、空间确认记录，以及图片数组中的文件名、原始 Base64、MIME、字节数、SHA-256、批准角色、授权状态、职责和具体属性指导。返回项目独立的资产 UUID 和注册记录。输入若自带其他项目 ID，则阻断。
- 编译输入：`generationBasis: 'art_direction_reference'`、空间任务、已审核的 currentInstruction、按顺序选择的 `referenceAssetIds`。服务构造 `artDirection` 快照，不信任调用者伪造的快照。
- 生成输入：项目 ID 和已编译任务 ID。执行使用编译时模型与快照，不因后来改变模型配置或授权而隐式换用另一条路线。

标准任务继续零引用；艺术指导参考图必须主动选择。旧 `reference_first` / `continuation` 并未在独立入口被顺带开放。当前 Web 页面未新增模式选择控件；本交付开放的是经过保护的业务 API 契约及其底层应用服务实现，未宣称已完成新的交互界面。

## 九州美学副本与四图请求

源项目 `ecfcdf23-a81d-4cd2-8250-74ecd221b7fb` 保持只读。只将项目记录、输入和上下文复制到本轮独立测试根目录；未读取或复制原凭据、设置或历史运行响应。新引用和确认文件仅写入测试副本。源项目（包含历史图片、Prompt、Packet 和运行记录）与附件前后逐文件 SHA-256 相同。

| 请求位置 | 人工认可文件 | 角色／职责 | 类型、尺寸 | 原始与实际请求解码 SHA-256 |
|---|---|---|---|---|
| `image[0]` | approved-translucent-canopy.jpg | approved_art_direction_reference／architectural_form | JPEG，2048×1152 | `0325629fe9f82580c61241c72a7b2e22ff3b453de3c83c4adba209a155140070` |
| `image[1]` | approved-sculptural-ceiling.jpeg | approved_art_direction_reference／spatial_integration | JPEG，2048×1152 | `2565443f1dd0e7915c33c3a059dc403334a0076c2fa3c02e1e894a24d48efc77` |
| `image[2]` | approved-pearl-installation.jpeg | approved_art_direction_reference／material_optics | JPEG，2048×1152 | `dba974b9ca9051c5949a1ea34002c74c9b7d3c9729be367aeae7a6dc3a728a6e` |
| `image[3]` | approved-gallery-entrance.png | approved_art_direction_reference／spatial_atmosphere | PNG，2048×1152 | `b7d472d98b6f1a45ccc570ee37c36dfb91fd7a499d0a76ad362401d06c8492cf` |

四张原图未裁剪、拼贴或重编码。失败图 `rejected-current.png` 与 Logo 均不在正向引用集合。素材注册模块拒绝负面和 Logo 角色，且检查与已知原始 Logo 重复的文件摘要。

正式 Prompt 保留暖白/乳白/浅暖灰建筑基底、轻薄半透明珠光层片、自然日光、克制局部紫色、展馆留白、单一艺术焦点与接待/候客/通达/隐私。旧模型提议的紫色亚克力、重点紫墙、羽毛光影投影和 S 形建筑套语未重新成为正向要求。确切工艺、厚度、固定方式和色彩面积比例仍未知，不声称设计效果已验证可实施。

## 请求能力与真实边界

独立 Seedream 适配器和艺术指导产品路线共用 `SEEDREAM_MAX_REFERENCE_IMAGES = 10`。独立标准模式上限仍为 0；被兼容保留但未对独立入口开放的旧模式不因此改变产品约束。艺术指导模式仅接受已核对请求协议的 `doubao-seedream-5-0-pro-260628`，未知部署模型或其他协议失败关闭。

使用的图片请求字段仅为既有的 `image` data-URI 数组，没有新造参考强度、权重或 `ref_mode`。公开接口支持多图及每图限制的依据是[官方图像 API](https://docs.volcengine.com/docs/ark/image-generation-api?lang=en)。本实现保守接受 PNG/JPEG/WEBP，单图不超过 30MB、3600 万像素，并校验完整解码。

本轮记录传输器替换的是服务原有的 `fetchImpl` 测试依赖：**执行的是正式 `compile → startValidated → image-service → adapter.execute → validator` 应用链路，捕获实际生成的 HTTP 请求体；不是上一轮 `compileRequest()` 工具预览。** 使用合成 PNG 作为模拟响应，校验 reasoner 也为离线 fixture。实际 Provider 调用 0、模型调用 0。主证据中的一条模拟生图请求和一条模拟校验仅计九州美学副本；另三行业基线/候选对照产生六条模拟生图请求及三条模拟校验，完整单元测试另有各自的隔离计数。这些均不是新生成作品或人工验收。

公共 `visual-workflow:*` 操作包装仍先执行真实 `verifyImplementation()`，没有注入替代实现、跳过保护、修改摘要或设置测试豁免。离线测试明确断言注册、编译和生成公共入口均被当前摘要拒绝。因此，下层正式应用集成通过与公共入口未放行分别记录，不能把它们合称生产入口 E2E 通过。

## 回归结果

完整日志：[submission-checks](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/art-direction-reference-route/submission-checks)。最后一次生产调整后，独立包完整测试及九州美学业务捕获/三行业基线对照再次通过；见 [final-owned-tests.log](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/art-direction-reference-route/final-owned-tests.log) 和 [final-service-capture.log](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/art-direction-reference-route/final-service-capture.log)。

| 检查 | 结果与限制 |
|---|---|
| 独立包全部测试 | **87/87 PASS**；新增正式路线 15 项，含四图字节/顺序、来源加载、逐阶段篡改、授权撤销、跨项目、容量、链接和实际 Logo 后合成 |
| 实际照片业务集成 | 四图请求通过字节、顺序、摘要、Prompt 与执行快照一致性检查；0 真实 Provider 调用 |
| 标准路线历史对照 | 其他医美、餐饮、酒店三个通用案例，与 `eace535` 的正式服务 Prompt、实际 HTTP 请求逐字相同，均无 image 字段 |
| 根测试 | **1701/1701 PASS** |
| CLI | **40/40 PASS** |
| Runtime Core | **14/14 PASS** |
| Runtime 应用层 | **1292/1294**；独立 Logo 公共操作和独立公共操作 E2E 两项因原摘要拒绝而失败，未绕过 |
| `verify:current-flows` | **FAIL**，同两项摘要阻断；不宣称发布门禁通过 |
| `repo:verify` / `repo:check` | **FAIL**，旧摘要与三个新文件未入记录；符合本轮不刷新要求 |
| 双向隔离／仓库守卫反例 | **56/56 PASS**；静态业务依赖无越界；独立摘要正向门禁仍 FAIL |
| Node Host 测试 | **15/15 PASS** |
| Node Host typecheck / Web build | PASS |
| 浏览器 smoke | PASS，0 Provider calls、0 business writes；不替代独立参考图业务入口验收 |
| Golden / 空间 Golden 边界 | **5 项 PASS**／PASS，0 Provider calls、无任何自动更新 |
| 版本、命名、workspace、obsolete、production、tracked-assets、project-specific、golden-boundary、analysis-guards | 全部 PASS |
| `git diff --check` | PASS |

回归中另修正上一提交的一项文档跟踪问题：通用文件名 `review.md` 被仓库政策禁止跟踪，现以相同内容跟踪为 `art-direction-audit.md`，本地旧路径仍保留。未改变政策守卫、断言或历史代码/兼容标识，报告内容字节不变。初轮失败日志保留，没有将其改写成通过。

真实照片捕获还发现长 Base64 的分组正则可能耗尽调用栈；已改为长度限制加规范编码往返校验，并加入大于 4MB 的确定性图片回归。该修复仅在新参考资产入口生效，不改普通素材或标准生图。

## 最终摘要更新申请

[申请文件](./integrity-update-request.json)包含 **18 项已有记录的最终 SHA-256 替换、3 项新增源文件记录**；其中包括已审核上一轮接线但尚未更新记录的差异。每项列出当前记录值、已审核提交值和此次最终值。

当前完整性记录文件 SHA-256 仍为 `7767be380484d444155df0b12ed4d1fe0fb860d562fb68869c8b43d3a3456bde`。若获明确批准，严格按申请的替换及追加顺序更新，预计运行时 implementationDigest 为 `a90b0cc873a7999525148c660c05b2f22c90e2399d7c0c73001eebabe84627b3`。**本轮未执行这些更新。**

`qualityAcceptance` 保持 `pending-separate-quality-repair`；独立分析 Prompt、冻结 Prompt 记录、提取记录、Web 前端完整性记录、Golden 和原人工验收基准均不变。完整性更新只用于审计实现身份，不构成视觉质量冻结或真实调用授权。批准后仍须重新核对最终源码摘要并重跑全部被摘要阻断的业务和仓库门禁。

## 风险与下一次费用

- 尚未用真实模型验证四图条件是否达到人工目标。工程通过不证明建筑艺术性、薄片光学、参考融合或文字清除质量；后续必须保留首图供人工判断。
- 官方数量/字段可用性及本地请求构造已核对，目标账户、实际部署端点与视觉执行效果未经本轮真实请求验证。其他模型不自动获得艺术指导权限。
- 原始工法、安装、医疗材料合规和固定比例没有被本轮建模或确认；这些设计效果要求不得冒充工程事实。
- 注册记录与用户指导分别原子写入。磁盘故障中断可能留下未引用的新资产或记录不一致；摘要复核会阻断执行，不自动回退旧指导。已保留的历史文件不被清理覆盖。
- 当前未增加 Web 页面模式选择；需要界面接入时仍应在独立前端内单独实施并评审相应完整性记录。

按历史模型、16:9、2K、单张、四张输入，单次生成目录价预计为 **0.60 + 3×0.02 = 0.66 元人民币**；依据 2026-10-18 核对的[官方价格](https://docs.volcengine.com/docs/ark/model-pricing?lang=en&redirect=1)。本轮实际模型费用 0。

0.66 元仅是生图估算，不包含后续真实图像校验。既有校验请求未设置确定的 token 上限，本轮没有声称整条真实流程已有 2 元硬上限；下一次调用应另行确认校验参数、总费用和调用次数。当前零自动重生成策略保持，任何预算都不授权绕过原门禁。

本轮到此停止，等待完整性摘要和正式参考图路线审核。未提交合并或发布申请，也未申请或执行下一次受控真实生图。
