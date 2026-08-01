# Space Role Intelligence (Phase 9C.1)

Phase 9C.1: 同一品牌、多空间输出时，保持统一设计语言，同时保证不同空间具有真实功能差异。

## 1. 核心目标

解决 Phase 9C 暴露的 "Architecture > Function" 问题：不同空间都退化成"白色高级空间 + 相似膜结构 + 相似玻璃隔断"。

新模块让每个 space_type (reception / lobby / vip-lounge / consultation / treatment / corridor / product-display / exterior) 有独立的：
- **role** (primary / secondary)
- **priority** (4 维 0-1: privacy / comfort / brand_display / circulation)
- **visual_rules** (lighting / material / density)
- **functional_constraints** (must_include / must_exclude / key_equipment / human_traffic)
- **narrative_focus**

## 2. 目录结构

```
space-role-intelligence/
├── data-contract.mjs              # Phase constant + Space Role schema + loadSpaceRole
├── compile-space-role-prompt.mjs  # compileSpaceRoleBlock (sceneType -> markdown block)
├── reception.json
├── lobby.json
├── vip-lounge.json
├── consultation.json
├── treatment.json
├── corridor.json
├── product-display.json
├── exterior.json
├── tests/
│   └── compile-space-role-intelligence.test.mjs  # 37 tests
├── bin/
│   └── run-space-role-smoke.mjs   # 8 space_type × JZMX text-level smoke
└── results/
    └── space-role-smoke/          # per-spaceType/{run.json, prompt.md, space-role-block.md}
```

## 3. 集成方式 (Phase 9C.1 §7 原则)

`compileSpaceRuntime` (space-runtime/) 在 Phase 9B.2 baseline (16 blocks) 基础上 INSERT `space_role_context` block (17 blocks)：
- 位置：`architecture_dna` 之后, `brand_translation` 之前
- 默认 `includeSpaceRoleContext: true`
- 关闭：`compileSpaceRuntime(brand, { includeSpaceRoleContext: false })` 返回 16 blocks
- 强制 space_type：`compileSpaceRuntime(brand, { spaceTypeOverride: 'vip_lounge' })`

**§7 不修改原则**：
- `brand_translation` 跨 9C.1 开关 byte-equal
- `architecture_dna` 跨 9C.1 开关 byte-equal
- 仅 ADD 一个 `space_role_context` block (16 -> 17)

## 4. 测试

```bash
npm run test:space-space-role-intelligence
```

测试覆盖 (§10 验收 6 项):
1. Space Role JSON 可加载 (8 JSONs, 必填字段, 4 维 priority in [0,1])
2. Prompt Compiler 支持新 block (compileSpaceRoleBlock 返回结构 + 内容完整)
3. Brand Translation 不变化 (3 brand byte-equal)
4. Architecture DNA 不变化 (3 brand byte-equal)
5. 不同空间输出明显不同 (8 priority fingerprints 全 distinct, must_include 全 distinct)
6. 同品牌保持统一 (同一 brand 不同 space_type, brand_translation / architecture_dna byte-equal, space_role_context 各自不同)

## 5. Smoke runner (text-level)

```bash
node space-role-intelligence/bin/run-space-role-smoke.mjs
```

跑 1 brand (JZMX) × 8 space_type, 产出 `results/space-role-smoke/{<spaceType>/{run.json, prompt.md, space-role-block.md}, integration-summary.md}`。

## 6. 不调真实 Provider / 不污染生产代码

- 不调 fetch / openai / seedream
- 不修改 v1-baseline
- 不修改 brand_translation / architecture_dna (byte-equal)
- 仅在 v1-experimental/space-role-intelligence/ 内
