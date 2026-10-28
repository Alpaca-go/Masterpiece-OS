# P7a 关键空间语义保真

[机器断言与逐词位置](P7a-layout-semantic-fidelity.json)覆盖13类关键要求，每项在正式Prompt及Provider Prompt均记录字符偏移与行号；[既有完整保真检查](P7a-field-fidelity.json)38行全部通过。不是仅检查关键字数量：确认记录与有效Packet逐值对比，关系原句按既有分句规则投影验证，再核对相向坐席完整句及五节点完整连接句。

| 职责 | 保留位置 |
|---|---|
| 入口→前台、前台↔候客→单个边缘面询→私密服务 | functionalNetwork→Functional & Commercial Requirement |
| 开放左前景、退让入口、巨墙不压厅宽、中央顶面 | structureLanguage→Architecture Language |
| 前台服务正面/员工工作侧/访客接近面，成组候客家具 | 原visibleRequirements前两行→Composition |
| 独立专业台面两侧各一椅、朝向隔台相向、转屏共看、空椅也可辨 | visibleRequirements→Composition |
| 短段透光隐私界面、后置错位私密入口、不展示治疗 | functionalRelationships→Architecture-Function Bridge |
| 单套珠光侧界面与局部上部连续连接，参与候客至面询递进 | structureLanguage→Architecture Language |
| 主辅曲面薄边、层深、留缝、非墙饰，弱紫虹彩与暖光 | artisticFocus及冻结materialEntries/lightingInteraction |

未改变五节点functionalProgram、spatialConcept、色彩/材料/光学/照明、mustAvoid等12个非修改字段。完整前台/候客和后期标识承载面原可见句也逐字保留。每条旧行的合并去向与理由见[逐行记录](P7a-deletion-and-merge-ledger.json)。

残余通用句“No artistic installation is required by the supplied sources.”仍由既有编译器输出；珠光被归到建筑语言，完整正向要求在Architecture Language与材质/构图中保留。此句存在潜在解释歧义，不能离线证明对模型没有影响；本轮未为消除它修改生产实现。布局语义通过不代表几何锁定或视觉质量通过。
