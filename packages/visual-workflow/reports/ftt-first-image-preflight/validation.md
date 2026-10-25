# 离线核验记录

冻结起点为 `3ed8c669dd7002fd3209cb7c51d788c0c041ea47`，分支为 `codex/rks-ftt-first-image-preflight`。仅新增本目录与单个离线证据脚本，不修改生产代码。

| 核验 | 结果 | 证据 |
| --- | --- | --- |
| E0 候选证据脚本 | 通过：原 B 重编译摘要一致；正式候选与 Provider 文本由现有代码产生；五项经营要求各保留一次；场景权威、语义和预检通过；草案 capture 被拒绝 | freeze-record.json、project-direction-draft.json |
| 既有 02D 设计与项目方向测试 | 21/21 通过，均为离线或模拟 Provider | logs/targeted-tests.txt |
| npm run repo:verify | 通过，含 current-flows、Web / Node Host 类型检查、生产边界、项目特判、完整性与隔离检查及守卫反例测试 | logs/repo-verify.txt |
| node --test tests/repository-policy.test.js | 2 项历史文件政策冲突，未增加冲突 | logs/repository-policy.txt |
| 不变性 | protectedRoots 相对冻结提交无差异；原资料逐文件 SHA256 一致；实现摘要保持 4b8ea1fa7c759bc05a42cf1ffd95e8b321f91aa9dfa63c283256250a4a8c5410 | source-and-scope.json |

历史冲突仍是 art-medical-identity / local-spatial-boundaries 下的两份 review.md，以及 art-medical-identity、local-spatial-boundaries、p7-spatial-layout-contract、p7a-prompt-budget、spatial-balance 下的五张历史 PNG。未删除这些文件，未放宽政策；本轮没有新增图像资产。

Compiler 对未确认配色使用既有 `model_proposal` 回退标签，草案 API 使用既有 `user_design_decision` 来源枚举；前者不表示本轮调用模型，后者不表示用户已经签署。草案实际状态为 draft，confirmation 为 null。临时验证项目没有完成分析，也没有真实用户项目关联；本轮没有调用 confirm。正式服务执行前，仍须完成隔离项目绑定、用户确认和重新编译核验。

本轮真实分析、生图、模型校验、自动重试、参考图输入和 Provider execute 均为 0。检查结果只证明离线输入路径和冻结记录，不证明视觉质量。没有更新 implementation-integrity、Prompt 基线、Golden、B1/P7B、知识验证状态，也没有合并、发布或部署。
