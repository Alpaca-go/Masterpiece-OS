# Version Semantics

## Four namespaces that currently coexist

| Namespace | Example | Meaning | Authority |
|---|---|---|---|
| Product version | `5.0.0-rc.1` | 可发布产品身份 | 根 `/VERSION` 是唯一源；同步到根与 Desktop package 及 runtime trace |
| Internal package version | `0.0.0` | 私有 workspace 占位，不表达能力阶段 | 各 `packages/*/package.json` 与 CLI package |
| Development phase | `R8.6`, `R10.4.1`, `R11.2.4`, `R2-B4` | 需求、修复、验收或烟雾阶段 | Git 提交、测试名、报告和 baseline manifest |
| Code implementation version | `v5`, `vnext`, task `v2/v3` | 目录/API/schema 的实现或兼容协议 | 代码路径、导出、schemaVersion、运行分支 |

它们没有可比较的全局顺序。`R11.2` 不能推导出 `vnext` 新于 `v5`；`schemaVersion: 6.0` 也不是产品 6.0。

## Current product rule

- `/VERSION`：`5.0.0-rc.1`。
- `scripts/sync-product-version.mjs` 负责同步。
- `npm run verify:version-consistency` 是门禁。
- 历史的 `3.3 / V18 / V6 / vnext` 不再作为用户可见产品称呼；内部路径与测试名仍可能是活跃证据。

## Namespace collisions

`VERSION_NAMESPACE_COLLISION` 已确认：

- `v1` 同时表示 space baseline、实验 schema/prompt 小版本、image-generation fixture 和 lab visual-translation 实现。
- `v2/v3` 同时表示图像任务 schema、source bundle schema、lab prompt/schema 与文档阶段。
- `R8.6/R9/R10/R11` 主要是 Space Generator 阶段和证据基线，不是产品版本。
- `vnext` 同时出现在 Desktop service、runtime compiler、测试 fixture 和 UI 组件；当前它是活跃内部协议名，不是发布版本。
- `final` 多数表示某次报告或输出文件，不证明实现最终、最新或可删除其前身。

## S0 interpretation policy

1. 运行入口和动态选择优先于名称。
2. 当前测试引用足以判为 `TEST_DEPENDENCY`。
3. 显式 fallback、环境变量分支仍属于 `ACTIVE_DEPENDENCY`。
4. 精确重复只标 `DUPLICATE_CANDIDATE`；Prompt/Compiler/Schema 重复额外视为 `BEHAVIOR_SENSITIVE_DUPLICATION`。
5. 证据不足统一 `UNKNOWN / KEEP`。
6. `SAFE_TO_DELETE` 不是合法 S0 状态。
