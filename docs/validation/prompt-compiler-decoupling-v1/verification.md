# Prompt Compiler 去行业耦合 v1.0 验证

日期：2026-07-30
Compiler：`vnext-prompt-compiler 3.3.0`

## 删除的耦合规则

- 删除 `platform / ecosystem / network / 平台` 关键词触发器。
- 删除平台角色自动注入的协作关系、复合空间功能和人物行为。
- 删除医美行业词直接触发的美容门店、注射、护理床和护理场景限制。
- 删除 Compiler 中固定的项目色彩比例、指定材料、指定光线和固定相邻业态门禁。
- Unified Visual Understanding 不再按品牌角色补齐固定材料、光线、人物、功能或负面场景。

## 新的结构化触发

- `SpatialTranslationV2.functionalRelationships`
- `SpatialTranslationV2.sceneProgram`
- `SpatialTranslationV2.peopleBehavior`
- `BrandMisreadRiskV2.appliesTo`
- `VNextTaskContract.scene`

人物、关系和场景程序只逐项翻译上述 Packet 字段。项目误读风险仅在以下条件全部满足时进入 Prompt：

1. `industry.status === confirmed`
2. `brandRole.status === confirmed`
3. 风险 `status === confirmed`
4. 风险 `appliesTo.subtypes` 命中当前 subtype
5. 可选的 family / scene 约束同时命中

旧 Packet 的 `functionalExperience` 只迁移为 `sceneProgram`；旧误读风险因缺少任务边界统一迁移为 `probable`，不会自动进入 Prompt。

## 反例结果

| 用例 | 结果 |
|---|---:|
| 科技平台关键词不触发人物、协作或医美规则 | pass |
| 医美诊疗室不继承旗舰接待的护理床负面规则 | pass |
| 非平台医美品牌不获得平台协同规则 | pass |
| 教育及餐饮平台只编译自身 Packet 决策 | pass |
| probable 风险或未确认品牌角色不可执行 | pass |
| 九州美学 22 项 Golden 回溯 | pass |

## 架构门禁

`npm run verify:no-project-specific-production-rules` 输出：

```json
{
  "status": "pass",
  "violations": []
}
```

该门禁扫描生产 Prompt、Template、Adapter、Fallback 和 Unified Visual Understanding 文件；发现项目专属生产词时返回 `PROJECT_SPECIFIC_RULE_IN_PRODUCTION`，发现平台关键词推断时返回 `KEYWORD_BASED_DOMAIN_INFERENCE_FORBIDDEN`，发现生产运行时读取 Golden 目录时返回 `GOLDEN_RUNTIME_READ_FORBIDDEN`。

门禁已接入 `npm run verify:current-flows`。

## 最终自查

- 根工作区：312/312
- Desktop：222/222
- Desktop TypeScript：pass
- `verify:no-project-specific-production-rules`：pass
- `verify:current-flows`：pass（离线，未调用外部模型 API）
