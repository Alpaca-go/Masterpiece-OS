# RKS-01 开发交付

日期：2026-10-24。工作分支：`codex/rks-ftt-seed-knowledge`。
起点：`3da7d1bab58e58dc091a20a3c55b1e6cc4f65d48`。

**离线原型与修正草案已实现；RKS-01 尚不能宣称全部验收通过。**
图 1 实际运行证据缺失；合成编译实验发现三项经营行为文本未传入正式 Prompt。
这两项明确保留为待补证/停止点，没有改写生产实现来绕过。

| 子阶段 | 交付 | 状态 |
| --- | --- | --- |
| A | 历史 Packet、人工验收、历史 Prompt 与 B1 静态证据清单、哈希、根因矩阵 | 部分完成，实际运行归因 UNDETERMINED |
| B | 纯函数分类、11 维词典、4 原型、权属验证、6 类冲突、知识记录校验、6 类反例 | 已实现并离线测试 |
| C | 方案目标 Tag 审计、proposed_offline 草案、retain/correct/remove/unknown 差异 | 已实现，未写入实际项目或确认记录 |
| D | 固定条件结构化对照、现有纯编译接口实验、输入不变性与零参考图/请求形状检查 | 实验已归档；经营行为字段传递未通过 |

## 实现与范围

新代码在 `packages/visual-workflow/offline/restaurant-knowledge/`，测试在该包的
`tests/restaurant-knowledge/`，报告在本目录。只有新增文件；生产代码、UI、Host、
Prompt、Compiler、Adapter、依赖/lockfile、Golden 和完整性清单全部未修改。

方案建议的 src 位置会要求纳入生产完整性记录。本轮明确不接入生产，因此采用同一
包所有权下的 offline 位置，且没有生产导入。不是新增生产权威或修改隔离守卫。
本轮仅定义内存中的研究记录校验，不修改任何持久化生产 Schema。

分类只处理显式结构化证据，支持同义词归一与未知词，不推断物业事实或装修材料。
冲突检查要求审查者提供推理边/不兼容对；它不是自动理解任意原始报告的 NLP。
用户目标和相冲突的提案均保留，事实冲突需人工审查。原型不会向其他项目写入，
不会将知识卡自动晋升，也不会将诊断转换为负面 Prompt。

## 可审核的交付入口

- `ftt-evidence-trace.md`、`evidence-manifest.json`、`ftt-root-cause-matrix.json`：证据与未知。
- `ftt-direction-proposal.json`、`ftt-direction-diff.md`、`ftt-structured-diff.json`：独立草案。
- `ftt-tag-audit.json`：方案目标与历史提案的逐条来源。
- `rks-candidate-knowledge.json`：5 张候选/项目观察卡，无跨项目验证或晋升。
- `offline-compile-comparison.json`：合成 Prompt 对照、sourceMap、字段丢失状态。
- `rks-offline-test-report.md`：验证命令、结果及限制。
- `rks-integration-proposal.md`：后续证据补齐、受保护 Compiler 调查与真实 A/B 计划。
- `../../offline/restaurant-knowledge/`：词典、原型、冲突定义、纯函数与使用说明。

## 停止与下一步

不进入 RKS-02，不真实生图，不请求在线模型，不合并、不发布、不部署、不切换日常入口。
下一步需要图 1 对应的只读项目副本/运行标识；Compiler 字段传递问题单独评审范围后
才能修复。真实质量回归另需明确次数、预算、异常停止和重试许可。

真实分析 **0**；真实生图 **0**；真实校验 **0**；自动重试 **0**。
