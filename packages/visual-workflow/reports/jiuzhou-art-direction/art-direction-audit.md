# 九州美学艺术指导对齐：离线审查交付

日期：2026-10-18。状态：**项目艺术指导与编译接线候选已完成；参考图仅完成离线请求可行性验证及实施方案；总门禁未通过，禁止真实调用、合并、发布或冻结视觉质量。**

本轮真实模型调用 0，图片上传 0，未读取或复制凭据。当前人工结论仍是“不通过”。自动测试、Golden 的既有标签及编译成功均不改变该结论。

## 基线与任务来源

- 当前工作分支 `fix/visual-workflow-image-quality-regression`，起点 `7609f6634acc0d98c8a07965b6b0432b679a6c0e`；原始工作区 clean。本轮未切分支、合并、rebase、commit 或 push。
- `git ls-remote --symref origin HEAD` 实测返回 `refs/heads/main`、`5270b00583d976360fd14f0059e2bc3706883875`。这与提供的 AGENTS 中旧默认分支说明不同，记录差异，不自行修改治理文档或迁移本地工作。
- [附件原任务](./jiuzhou-art-direction.md)由本轮用户请求明确指定为项目开发任务；它的项目视觉目标在本轮授权范围内生效。附件中描述的未来受控生图不构成本轮调用授权。
- 已逐张查看四张认可图和失败图。采用图二/图三的轻薄半透明结构、图四的珠光层片光学关系、图五的展馆留白与自然光；这是用户确认的设计目标，不伪装成历史原始素材事实或已验证工法。

## 历史提案如何压过新方向

根因包含两层：历史提案仍可执行；正式空间分支忽略用户确认记录。服务会读取 `project-context/user-confirmed-visual-decision.json`，但 `generation/compile.js` 的空间分支原先直接使用历史 Packet，并输出 `userConfirmedVisualDecision: null`。现有应用函数只接在另一条模板编译分支。离线重放 HEAD 源码证明：同一 task 挂上完整确认记录，修复前 Prompt 仍逐字相同。

以下都是**历史模型提案**，不因 `ready`、历史 `confidence` 或旧记录中的 `confirmed` 字样而提升为本轮用户批准的建筑方向。

| 历史字段 | 原文或准确片段 | 与当前目标的冲突 | 候选处理与最终 Prompt |
|---|---|---|---|
| `creativeDecision.preserveCore[0]` | 紫色主色调 (Peacock Violet) | 品牌色等级被误读成室内大面积颜色权限 | 编译内存副本替换；原文不进入最终 Prompt |
| `creativeDecision.uniqueUpgradeThesis` | 保留紫色和流线型核心 | 继续把色彩/形状置于建筑艺术之上 | 替换为建筑、材料与自然光的关系；原文不再执行 |
| `colorSystem.primary[0].role`，及 `spatial.colorBehavior` 镜像 | 品牌识别，用于重点墙面、家具软装、导视系统。 | 将多个大体量表面同时染紫 | 改为近白建筑基底和局部紫色虹彩；无固定比例 |
| `materialSystem[0]`，及 `spatial.materialLanguage[0]` | 紫色半透明亚克力/玻璃；透光、渐变、光滑 | 未要求薄片层次与珠光透射，容易落入厚染色玻璃 | 以用户指定光学效果替换；不声称真实配方、厚度、固定方式 |
| `lightingSystem.source`，及 `spatial.lightingLanguage` | 隐藏式灯带、射灯、艺术吊灯 | 装饰照明可能替代日光与材料本体表现 | 改为自然日光及克制间接光；旧三项不进入最终 Prompt |
| `spatial.signatureSpatialMechanism` | 流线型隔断/天花造型：模仿羽毛的层叠和S形曲线；渐变光影系统 | 以通用曲墙、顶面和纹理投影替代空间设计 | 改为单一、与建筑结合的珠光薄片艺术系统；结构和透射关系另有明确要求 |
| `spatial.positiveDifferentiators[0]` | 区别于传统医美的冰冷白色，使用紫色调和温暖材质。 | 直接抵消认可图的安静近白建筑基底 | 替换；旧原文不进入最终 Prompt |
| `spatial.functionalExperience[0]` | 进入：被紫色光影和艺术装置吸引，感受品牌调性。 | 仍把紫色光影作为入口主体验 | 改为展馆留白、自然光及退居次位的候客设施 |
| `spatial.brandIntegration` | 前台背景墙：Logo与抽象羽毛造型结合 | 易把品牌图形放大为贴墙装饰，并生成错误字样 | 保持原始 Logo 后期合成，模型不画标识或文字 |
| `spatial.mustBeVisible` / `functionalNetwork` | 咨询家具、治疗设备、术后恢复座位等全院节点 | 多个空间功能抢占接待镜头 | 临时任务只要求接待、候客、通行和隐私边界；历史完整功能网络保留在只读原 Packet |

[完整逐字段矩阵](./conflict-matrix.json)列出 175 个变化的旧字符串叶节点，包含原文、字段路径、来源分类、处理权限、是否仍出现于历史/最终 Prompt。`replacement` 是同一路径的替代值，不表示数组索引之间具有一对一语义对应关系。它同时包含非冲突但随完整项目指令替换的条目，不能把 175 当作独立缺陷数。关键冲突原文的最终残留检查为 0。

旧 `MISREAD_LUXURY_FASHION` 风险仍保留为历史诊断：它限制零售/时尚品类误读，不具有禁止美术馆建筑气质的权限。原项目事实、品牌标识资产、历史图片与历史 Packet 未重写。

## 输入、正式 Prompt 与实际修改

- [项目用户确认输入](./project-input.json)：只属于源项目 `ecfcdf23-a81d-4cd2-8250-74ecd221b7fb` 的空间交付物；本轮仅挂在离线任务，不写回原项目。包括完整空间指导、临时 task 指令、禁忌与四项来源引用。
- [正式编译 Prompt](./formal-prompt.txt)：7412 字符，SHA-256 `94d29f17731ec1a3e741c891c2ab929833dc583a6ff49a290ad6b6bcf8f207b7`。
- [标准 Provider Prompt](./provider-prompt.txt)：标准路线仍是零图片，不宣称模型看过参考图。
- [参考请求 Provider Prompt](./reference-provider-prompt.txt)：离线适配器预演，明确 image 1–4 的不同职责、单一艺术系统及禁止复刻标识/水印。
- [实际代码差异](./code.diff)：四个生产文件及三个新增离线工具/测试文件；没有修改共享编译器、创意策划、视觉迁移、公共宿主、Web 界面或根 lockfile。

候选修改将既有确认应用函数接入正式空间分支，在源适配、语义验证与编译门禁之前产生内存有效 Packet；无确认时保持历史 Prompt。新增的项目匹配检查只作用于显式确认任务，避免改变普通任务的兼容行为。补齐确认来源引用合并，并让空间、颜色、材料、艺术焦点追踪区分 `user_confirmed` 与 `model_proposal`；设计意图不等于已核实材料事实。

记录受保护的原始事实与完整历史输入，替代的只是当前任务执行权限。用户记录缺少必要空间数据、未确认、项目不匹配，仍失败关闭；不能拿安装装置代替功能网络。

## 参考图片请求证据与运行边界

[五图注册表与 SHA-256](./registered-references.json)、[实际请求字段/字节回验](./request-evidence.json)、[脱敏请求预览](./reference-request-review.json)已提交。四张正向图依次位于 `image[0..3]`，均 2048×1152，JPEG/JPEG/JPEG/PNG；失败图仅为 `rejected_comparison`，未进入正向 payload。原附件五项哈希及大小均匹配 manifest。

本地精确请求含四张图的实际 Base64，保存在 [reference-request.json](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/jiuzhou-art-direction-review/submission/reference-request.json)。逐项解码回验 SHA-256，与注册原图相等；不是只在 trace 写文件名。该文件未发送、未上传、未加入版本控制。仓库内的脱敏副本省略 Base64，并明确标为不可直接发送的评审格式。

**尚无正式参考图执行路线。** `service.js` 的 `VISUAL_WORKFLOW_STANDARD_ONLY`、`image-service.js` 的标准/空参考守卫与最终 `references: []` 完整保留。未把参考图注入 standard，也未把底层预演作为业务 E2E。具体缺口、文件与参数方案见[参考路线可行性与实施方案](./reference-route-plan.md)。

## 回归与门禁结果

日志目录：[离线回归证据](E:/Masterpiece-OS-Main-Publish-20261015-Verified/.codex-smoke/jiuzhou-art-direction-review)。生产修改稳定后的 `reviewed-*` 为复核结果；最初失败日志原样保留。

| 检查 | 实测结果 |
|---|---|
| 独立包完整测试 | **72/72 PASS**，包含新增 7 项艺术指导/图片请求授权与反例测试 |
| 根 `npm test` | **1701/1701 PASS** |
| CLI | **40/40 PASS** |
| Runtime Core | **14/14 PASS** |
| Runtime 应用层 | **1292/1294**；两项因完整性摘要拦截失败，分别为独立 Logo 操作及独立业务离线 E2E |
| `verify:current-flows` | **FAIL**，同两项完整性拦截；未声明文档/业务总门禁通过 |
| `repo:verify` / `repo:check` | **FAIL**，完整性检查发现 `generation/compile.js` 与记录不同后停止；未绕过 |
| Repository Contract | PASS；无 Golden 变更、无兼容契约变更 |
| 隔离与仓库守卫反例 | **56/56 PASS**；独立实现摘要的正向校验仍 FAIL，不能合称隔离全通过 |
| Node Host 测试 | **15/15 PASS** |
| Web build / Node Host typecheck | PASS；current-flows 短路后的类型检查单独执行 |
| Web smoke | PASS，0 Provider calls、0 business writes；不是独立参考图业务 E2E |
| Golden | **5 项 PASS**，0 Provider calls、无自动更新；既有人工标签不代表本项目新图通过 |
| 空间 Golden 边界、workspace、production、project-specific、golden-boundary | PASS |
| 版本一致性/命名、obsolete、tracked-assets、analysis-guards | PASS |
| `git diff --check` | PASS |

首轮新增无条件项目 ID 检查影响了四项既有普通任务测试，已将该检查收窄到显式确认任务。离线工具最初内嵌项目文案触发项目专属规则扫描，已把数据迁至项目 JSON；工具读取显式输入。未改测试预期、扫描器、Golden 或任何门禁。稳定后独立测试与根测试重跑通过；初轮证据仍可审计。

[完整性差异](./integrity-review.json)列出四项记录摘要与候选摘要，没有刷新 `implementation-integrity.json`。[只读证明](./offline-proof.json)及其所链完整源项目清单证明原项目、附件、提取记录、完整性记录和冻结 Prompt 摘要均保持原样。人工验收状态未覆盖。

## 费用预检与审核后事项

保持历史条件：volcengine / `doubao-seedream-5-0-pro-260628`，reception / entrance_view，16:9，2K，单张；区别是显式参考模式与项目指导。编译器原有镜头投影仍为 `reception_arrival_view`，没有人为切换镜头策略。当前独立设置所选生图与分析模型分别为上述 Seedream 和北京 `qwen3.6-plus`，只读公开配置，未取凭据。

四张输入的 Seedream 候选单次成本为输出 0.60 元 + 第 2–4 张输入 3×0.02 元 = **0.66 元人民币**；见 2026-10-18 核对的[官方价格](https://docs.volcengine.com/docs/ark/model-pricing?lang=en&redirect=1)。这是目录价估算，不是账单。

若审核后另行实施受控校验请求限制：北京 Qwen3.6-plus 输入 ≤256000 tokens、输出 ≤4096 tokens、关闭思考且仅一次校验，则预留 0.561152 元，与生图合计 **1.221152 元**；候选授权预算可为 **2 元**。价格依据为[Qwen 官方北京价格](https://help.aliyun.com/zh/model-studio/qwen3-6-plus)。

**该 2 元不是当前生产执行器的硬上限。** 本轮检查发现常规校验 reasoner 未设置 `max_tokens`，也不普遍关闭思考，不能沿用历史执行器的 4096-token 限制来冒充当前已约束费用。正式参考路线和受控请求计数/费用限制均须完成、复核并通过原有门禁后，才能提交下一次具体调用申请。不得跳过校验或直接调用本轮预演工具代替正式运行。

到此等待人工审核：审阅项目指导、四图顺序、正式 Prompt、候选源码与摘要差异、参考路线方案及预算前提。此次交付不包含下一次真实生图、不改变人工不通过结论，不合并、不冻结。
