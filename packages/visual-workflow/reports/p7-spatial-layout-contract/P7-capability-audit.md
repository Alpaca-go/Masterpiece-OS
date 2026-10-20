# P7 能力审查

2026-10-20 Asia/Shanghai；先读规范并审查，再编辑。基线 fix/jiuzhou-final-spatial-balance / 6aeaf3df46e0b206bd1688764df75940f45f1c78，初始工作区干净，符合附件G0。

现有机制**部分支持空间约束**：能承载可复用的分类文字关系，不能实现空间布局锁定或保证生图遵循。项目字段足以表达本轮五节点与席位拓扑，所以允许最小项目级尝试；不需要虚构字段或扩展Schema。

## 字段到Prompt的证据

- [项目方向存储](../../src/project-design-direction.js)：第10–13行列出真实字段；第74–80行将structureLanguage、functionalNetwork、functionalRelationships、visibleRequirements→mustBeVisible、compositionRequirements、artisticFocus→signatureSpatialMechanism/brandRoleManifestation写入spatialTranslation，按换行形成字符串数组。它不是有节点ID、边、碰撞、尺度或坐席朝向验证器的场景图。
- [确认覆盖](../../src/generation-runtime/generation/user-confirmed-visual-decision.js) 校验并应用用户方向；[来源适配器](../../src/generation-runtime/space/source-adapter.js) 第94–150行收集网络/关系，第374–419行分类并投影到建筑、功能、构图等块；分类与投影可能改变表达位置。
- [空间编译器](../../src/generation-runtime/space/compiler.js) 第153行写功能网络，第219行写可见项，第432–440行记录块来源；这些是Prompt语义表达，不是几何求解。
- [编译入口](../../src/generation-runtime/generation/compile.js) 第123–140行先执行空间编译和预算门禁，通过才执行Adapter；[Seedream Adapter](../../src/generation-runtime/generation/seedream-adapter.js) 属于后续请求边界。本轮该边界未到达。

## P6 表达风险与模型不稳定的区分

只读人工看过P5/P6真实图。P6前景实体墙确实压缩入口所见主厅，面询两椅仍同侧，珠光更像墙面艺术，且前台出现额外面部屏。P6结构与可见项多次强调“完整实体墙、入口框景、实体建筑”，未约束这些界面退让主厅到达视廊，可能留下大墙解释空间。“仅一侧附近、局部收束”未同时充分说明建筑职责，可能退化墙饰。

P6已经明确操作侧/对侧、隔台相向及共看屏，因此同侧座椅**不能归因于完全缺少要求**；尚可增强独立台面及双方可入座关系，但生成模型遵循不稳定仍是已见风险。文字修正不等于稳定几何，不保证P7成功。

## 审查后的实际结果

六字段在新副本完成网页确认，首次正式编译却在12124字符触发12000硬上限。G4失败后依附件停止项目修订；最终Prompt保真、零参考实际请求均未验收。[编译错误](P7-compile-error.json)。

局部后期能力见[专项审查](P7-screen-composite-feasibility.md)。本轮没有生产实现修改、真实模型调用、合并或发布。
