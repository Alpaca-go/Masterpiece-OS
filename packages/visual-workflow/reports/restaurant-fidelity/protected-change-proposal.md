# 独立生产变更申请草案（本轮未实施）

## 场景作用域与显式镜头权威

离线证据 confirmed：storefront/front 在纯编译中没有 targetScene/targetProgramId，viewStrategy=null，shotSource=legacy_project_default，authority gate 却 pass。B 的厨房制作、厨房热气、桌边顾客三句 sceneProjection=unresolved，仍由 composition 输出。入口/entrance_view 会过滤这三句，但中文“点餐区 -> 明档制作区 -> 取餐区 -> 就餐区”仍为 current_shot。详情及 sourceMap 见 compiled-evidence.json；这些是合成/历史派生请求，不是图 1 根因。

建议独立审批后审查 src/generation-runtime/space/semantic/separate-space-semantics.js 的场景/中文功能识别、source-adapter.js 的目标场景映射、compiler.js 的场景权威及 unresolved 可见要求处置。路径是待调查影响范围，不表示三文件一定都需修改。外立面未识别应 fail closed 或有明确 exterior 程序；必须保留显式 front 及其来源。未知可见要求不能因可分类就获得当前镜头可见权威。中文网络中的就餐/制作应按来源子句保留为项目依赖或镜头外关系，不能把全项目网络画进入口。不要以改 shot、全局删厨房/顾客或 FTT 品牌特判绕过。

验证范围：storefront/entrance/dining 与其他所有支持场景；中英文关系、显式/默认镜头、未知场景、跨行业功能、visible owner、Provider Prompt、完整独立流程与公共入口回归。若实现受保护，提交准确差异、候选 SHA256 与独立完整性审批；不得本轮更新摘要或 Golden。

## 通用气质与文案

离线证据 confirmed：A/B 都含 reception/waiting/privacy、gallery-like、premium/high-end 通用措辞；是否导致图像同质化仍 undetermined。建议独立审查包内 space Prompt 模板与 architecture-context 构造器，让功能和艺术方向来自项目授权，避免任何行业固定风格规则。负向 no generic AI clinic look 不是正向诊所节点，不能仅据单词误判。

## 历史输入规范

原始品牌硬可见文字被 gate 拒绝是现有行为，不建议放宽以允许 Logo/文字直接生成。需未来明确 post-composite 输入契约及可见砂锅/热气表达的人工确认映射，不自动改写历史 Packet。

本轮仅提交提案，生产实现、Prompt、完整性摘要、Golden、配置与历史验收记录均未改动。当前已完成允许的离线实验；受保护修复与真实生图继续等待独立审核。
