# 九州美学空间专属性恢复审计

## 结论

在上一轮 Project Contract 修复后，当前剩余质量回退的**首次丢失层**重新定位为 **Visual Decision Packet（项目数据 / Visual Understanding）**。

原始 `creative-understanding.json` 将九州美学误读为“高端东方美学生活方式品牌”，`visual-memory.json` 又把名片、礼袋、标签和礼盒等包装语义写成主要视觉系统；原始 Packet 虽恢复“医美/美学服务”，但品牌角色仍只有“美学服务提供者”，空间转译仍包含白、紫、金、紫色亚克力和可读羽片结构。Project Contract 与 Prompt Compiler 对这些上游事实做了忠实编译，模型因而只能在通用医美前台与孔雀/羽毛主题之间回退。

本次只在该首次错误层增加项目级、用户确认的 Visual Decision 覆盖件。公共运行时代码仅校验项目 ID、适用媒介、证据和结构，再合并为 Effective Visual Decision Packet；不包含九州、美学或医美答案。Golden、跨项目扫描、去行业耦合和包装证据门禁全部保留。

## 分层判断

| 层级 | 证据 | 判断 |
|---|---|---|
| Visual Understanding / Visual Decision Packet | 项目角色被缩减为“美学服务提供者”；空间事实缺少展示—接待—咨询—系统服务关系；旧资产仍可读为羽片结构 | **本轮首次错误** |
| Project Contract | 能接收并保留上游 role、upgrade thesis、abstraction、functional relationships 和 evidence | 本轮不改审美决策，仅消费有效 Packet |
| Media Translation | 原 spatial translation 是错误 Packet 的一部分；覆盖件在同一数据层补齐可执行空间关系 | 随首次层一并校正 |
| Prompt Contract / Compiler | 原编译忠实但公共模板位置过早；现只调整来源顺序和通用门禁 | 放大器，非审美答案来源 |
| Model Adapter | payload 不含 Logo reference，Logo 强制 post-composite；无项目内容转换 | 非首次错误，不修改 |

## 十项原子决策回溯

完整结构见 `atomic-decision-backtrace.json`。十项均从用户确认源进入 Effective Packet，再进入 Contract、Prompt/source map 和 payload：

1. 全链生态平台角色。
2. 展示—接待—咨询—系统服务的连续关系。
3. 从具象孔雀羽毛与通用奢华前台升级。
4. 东方但不古典。
5. 高端但不奢华堆砌。
6. 专业但不冰冷。
7. 有生命感但不具象仿生。
8. 旧资产只保留生长、轻盈、层级和有序展开。
9. 禁止孔雀主题、羽毛墙、羽片屏风、白紫金医美模板。
10. Logo 仅预留干净识别区并强制后合成。

## 九类制品差异

`before/` 与 `after/` 分别导出：

- `visual-understanding-core.json`
- `visual-decision-packet.json`
- `project-specific-generation-contract.json`
- `spatial-translation.json`
- `packaging-translation.json`
- `generation-blueprint.json`
- `final-prompt.md`
- `prompt-source-map.json`
- `preflight-report.json`
- 补充审计制品 `provider-payload-preview.json`

字段级差异见 `artifact-diff.json`，行级 Prompt 差异见 `space-prompt.diff` 和 `packaging-prompt.diff`。空间 Prompt 的项目身份、升级命题、语气边界、抽象转译、服务关系、色材光决策均排在公共空间生产模板之前；source map 明确记录 `user_confirmed_visual_decision:user-confirmed-jiuzhou-space-specificity-v1`。Provider payload 不含 Logo reference asset。

## Gate 结果

- 九州空间 dry-run：`pass`，无 block/warn。
- 九州包装：`PACKAGING_PRODUCT_ROLE_MISSING` 与 `UNSUPPORTED_PRODUCT_INVENTION` 阻断，未生成未确认产品。
- 新增/强化：`PROJECT_SPECIFICITY_TOO_LOW`、`UNIQUE_UPGRADE_THESIS_MISSING`、`LITERAL_LEGACY_ASSET_REUSE`、`GENERIC_INDUSTRY_FALLBACK`、`BRAND_ROLE_UNDEREXPRESSED`、`LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED`。
- Golden 隔离、项目专属词扫描、跨项目语义、跨媒介和去行业耦合门禁保持启用。

## Regression Fail Cases

- `jiuzhou-space-peacock-theme-fail`：大尺度羽片/孔雀主题化空间。
- `jiuzhou-space-generic-medical-partial`：移除明显 Logo/紫灯/金饰后仍退化为暖白通用医美接待空间。
- 原空间和包装真实失败运行继续保存在 `regression-fail-cases.json`。

## 回归范围

- 九州空间：项目数据覆盖、Prompt 回溯、Gate 与 payload dry-run。
- 九州包装：缺少产品与结构角色证据时正式阻断。
- 同行业不同医疗项目：离线结构化对照不得继承九州角色、服务链和空间答案。
- 非医疗项目：餐饮、教育、技术平台夹具不得继承九州或医疗规则。

真实 Provider 在全部离线门禁通过后只调用一次：

- Provider / model：Volcengine / `doubao-seedream-5-0-pro-260628`
- Run：`d7fe0976-018c-41e9-9759-bcaf45e3acf3`
- Compilation：`vnext-task-d0997d7e-29ec-493c-9681-d1185995e325`
- 模型调用：1
- 时长：83,226 ms
- 图像：`image-generation/d7fe0976-018c-41e9-9759-bcaf45e3acf3/images/image-01.png`
- 结构性回归：通过。没有孔雀/羽毛、紫色灯带、金色装饰或大 Logo 墙；入口—接待—咨询层级、连续曲面、半透明界面和后合成留白清晰。
- 项目气质验收：部分通过。画面仍偏暖白极简诊所/办公室，旗舰展示和“全链生态平台”的独特识别不足。

按“一次 smoke、禁止随机重试”的约束，本次没有继续采样，也没有为了追图越层修改 Model Adapter。
