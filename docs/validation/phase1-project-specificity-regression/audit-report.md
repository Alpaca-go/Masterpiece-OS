# Phase 1 项目专属性丢失审计

## 结论

首次丢失发生在 **Project Contract**，不是 Golden、公共行业模板或 Provider 请求适配器。

`outputs/creative_decision.json` 和活动 Generation Blueprint 一直保留“结构显影、深午夜紫/暖米白、参数化翎羽矩阵、侧光材质显影、克制留白”等批准决策；旧 vNext 链路却只读取新生成的 Visual Decision Packet。空间分支还完全没有生成 Project-Specific Generation Contract 和 Preflight。包装分支虽生成 Contract，但只从 Packet 编译，且把无产品证据的泛化产品角色当成可生成事实。

第一次修复把批准决策加入 Contract，但与旧 Packet 并列，真实输出仍回退。第二次修复在同一 Project Contract 层确立来源优先级：批准 Creative Decision 覆盖后生成的泛化色材判断；公共代码仅做来源权威、媒介适用性和证据门禁，不包含九州或医美审美答案。

## 逐层定位

| 层级 | 优化前证据 | 判断 |
|---|---|---|
| Project Contract | 空间制品缺失；包装 Contract 只含 Packet 来源；未加载批准 Creative Decision | **首次错误** |
| Media Translation | Spatial/Packaging Translation 本身未在本次改写；仍可观察到泛化字段 | 下游输入质量问题，但不是本次首先修复层 |
| Prompt Contract / Compiler | 忠实放大 Packet 的白/紫/金与紫色亚克力；空间未跑 Preflight | 首次错误的放大器；仅接入 Contract 与门禁 |
| Model Adapter | 旧请求携带 Logo；修复后 Logo 引用为空、改为 post-composite | Logo 路由已修；最终图仍有部分模型服从偏差 |

## 结构化制品差异

- `visual-decision-packet.json`：0 项变更。
- `spatial-translation.json`：0 项变更。
- `generation-blueprint.json`：0 项变更。
- 空间 `project-specific-generation-contract.json`：由缺失变为完整 Contract，记录批准决策 ID、版本、来源和 specificity。
- 包装 `packaging-translation.json`：新增产品角色证据字段并标记 insufficient；现有结构证据保持。
- `prompt-source-map.json`：新增 Project Contract 决策来源映射。
- `preflight-report.json`：空间由未执行变为 pass；包装由 pass 变为证据阻断。

完整字段级差异见 `artifact-diff.json`，八类制品的 before/after 文件位于同目录的 `before/` 与 `after/`。

## Prompt 差异

空间 Prompt 从 4,819 字符变为 6,735 字符：

- 新增批准的“结构显影”、深午夜紫/暖米白、参数化非具象结构、侧光材质显影。
- 移除批准决策存在时旧 Packet 的 Peacock Violet、哑光白、金属金和紫色亚克力执行权。
- 加强非字面复用约束：墙面、隔断、壁画、家具轮廓和重复表面不得重新读成旧来源对象。
- Logo 从 `reference` 改为 `post_composite`，Provider referenceAssetIds 为空。

包装 Prompt 从 3,136 字符变为 4,951 字符，但 Preflight 阻断，未调用模型。行级差异见 `space-prompt.diff` 与 `packaging-prompt.diff`。

## 新增 Gate

- `PROJECT_SPECIFICITY_TOO_LOW`
- `GENERIC_INDUSTRY_FALLBACK`
- `LITERAL_LEGACY_ASSET_REUSE`
- `PACKAGING_PRODUCT_ROLE_MISSING`
- `UNSUPPORTED_PRODUCT_INVENTION`
- `LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED`

既有 Golden 隔离、项目专属规则扫描、跨项目语义扫描、跨媒介扫描与行业耦合门禁均保留。

## 回归结果

- 九州空间 dry-run：通过。
- 九州包装 dry-run：按设计阻断；未调用模型。
- 同行业不同医疗项目：离线结构化对照通过，无跨项目/跨媒介泄漏。本机没有第二个真实医疗项目，因此没有伪造真实项目或调用模型。
- 非医疗对照：餐饮/消费夹具通过，无九州或医疗规则继承。
- 真实 Provider 空间：
  - `ea21d802-a334-486e-8892-035dbb963e7c`：失败并登记。
  - `8551a8c0-ea48-4765-a27f-c7c2ff140ae7`：Logo/灯带/金色/大羽片墙明显改善，但暖白石材和可读鳞羽压纹仍偏通用，标记 partial fail。

这说明首次错误层已经修复，但真实图尚不能宣称完全通过项目气质验收。按“只修首次错误层”要求，本次没有继续修改 Model Adapter 或添加九州/医美公共模板。

## Gate 与测试

- `npm test`：330/330 pass。
- `npm run desktop:test`：223/223 pass。
- `npm run verify:current-flows`：pass，且保持离线。
- `npm run verify:no-project-specific-production-rules`：pass。
- `npm run verify:golden-boundary`：pass。
- `npm run verify:production-boundaries`：pass。
- Desktop TypeScript typecheck：pass。
