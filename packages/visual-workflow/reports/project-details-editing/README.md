# 项目名称与行业人工编辑修复

项目创建后，名称和行业输入框原先被禁用，且没有资料更新接口。现在在“导入素材”页面允许手动编辑并点击“保存项目资料”；未保存时阻止使用旧资料分析或生图。项目切换、素材导入与分析完成后同步编辑器值。

保存接口只接受当前项目的名称和行业，校验空值、200 字长度、版本时间戳及运行状态。仅实际变化才写入。名称同步到品牌事实并标记为人工输入。资料变更会使旧分析上下文失效，需重新分析后生图；历史报告、Packet、运行记录和方向记录保持原样，方向读取状态要求重新核对。此动作不自动分析或确认。

## 离线验证（2026-10-23）

- 独立视觉工作流完整测试：93/93，包括新增 2 项资料编辑回归。
- Web typecheck + build、repo:verify（含 current-flows）、Golden 全部通过；Golden 未更新。
- 浏览器使用独立临时 userData：编辑、保存、侧栏更新、刷新后重开均通过。
- P7B 在快照的隔离复制品执行原 Adapter 离线截获，三项摘要完全一致：
  - Formal: 031d2d20b203d73b5a11b77c27792bde9b02a15cc912c8e0c5f2d9f8dd886ab9
  - Provider: a7b402054cc0153517dd3d2411668fe0d1583f89c9c9eb3b8f30b6d64edfdc97
  - Request: 79d70c85ba1eced01a0256dcb60cb60dc8e6acf1d1021a903f78eddbcb090b99
- 正式 userData、P7B 历史实例、工作实例和原始快照逐文件 SHA256 前后不变。
- 真实模型调用、重新分析、生图和重试均为 0。
- Pipeline、Prompt、Compiler 和 Adapter 无改动；仅更新本次业务文件对应的完整性摘要。

本地证据：E:/MP-details-evidence-20261023（测试日志、offline-rebuild-result.json、protected-result.json、details-saved.jpg）。
