# RKS-01E · 冯烫烫真实运行证据补齐

日期：2026-10-24（Asia/Shanghai）。起点：`224dc525845521e10f7a710e64120308a2f06054`，分支 `codex/rks-ftt-seed-knowledge`。结论：**已确认用户指定图 1 文件身份；尚未建立该图与 Masterpiece 执行记录的关联，按停止条件停止实际根因归因。**

## 身份核验

用户在本轮明确指定 `C:/Users/kyrie/Downloads/ChatGPT 图像 2026年10月24日 17_57_30.png` 为图 1。仅读取该文件，没有枚举 Downloads。文件长度 2,881,625 bytes，SHA256：

`9cf31507e9566e3d754ac6f006b64d97d037a279782177125a0d51a94196b03c`

从 Node Host 的既有路径规则定位 `%APPDATA%/masterpiece-os-desktop/visual-workflow/data/projects`，只读项目索引后找到名为冯烫烫的候选项目 `3b5b03c0-915a-41aa-9c54-4ffaa166ab88`。其项目内 compilation 和 workflow 的 runs 索引指向同一候选运行：

| 项目 | 候选记录值（不等于图 1 的身份） |
| --- | --- |
| Project ID | `3b5b03c0-915a-41aa-9c54-4ffaa166ab88` |
| Run ID | `a4401411-f450-4e70-ac83-04c4b6599ec6` |
| Task ID | `vnext-task-2164ef3f-a305-4fc3-a7bb-6813788f7d76` |
| 运行状态 | `succeeded` |
| 记录时间 | created `2026-10-23T05:50:13.777Z`；completed `2026-10-23T05:51:34.960Z` |
| 输出 SHA256（实算与 run.json 一致） | `a54272219939f4aeb28168f7cdf69b281b759f872c9572eb24fbea89e5a2b9e3` |
| 输出大小 | 7,419,618 bytes；2816×1584 |

候选输出位置为候选项目下 `image-generation-vnext/compilations/<Task ID>/output.png`。两个文件哈希不同；只读查看画面也显示不同的店面构图和布置，不能用重编码解释并认定是同一图。候选项目 input 下 10 个素材文件也没有与图 1 相等的文件哈希。既有默认 Shared Data 的 projects 目录检查没有返回同名项目；未读取其设置或凭据。仓库 `projects` 为空占位；仓库内 `.codex-smoke` 的项目文件名清单没有提供图 1 的关联。未以相似餐饮内容或“P7B”目录名推断身份。

这些结果仅证明本次检查范围内没有建立关联，不证明本机所有可能的自定义数据根目录中不存在其他记录。未查找无关私人目录，也未读取 settings、credential store、API Key 或完整 Provider 响应。

## 七项核对与停止点

| 要求 | 图 1 可证明的结果 | 缺口 / 停止点 |
| --- | --- | --- |
| Project ID / Run ID / 图像哈希 | 用户文件路径及哈希 confirmed；Project / Run 关联 undetermined | 候选输出被排除为图 1 的同文件证据 |
| 当次分析输入 / VisualDecisionPacket | undetermined | 候选目录存在项目输入和 Packet 文件；不将其内容归给图 1 |
| B1 自动填充及来源 | undetermined | 没有与图 1 绑定的读取/保存快照，未把当前代码推导当作当次事件 |
| 保存、确认状态及分析指纹 | undetermined | 候选 compilation 的 direction 快照为 null；不能据此判定图 1 未确认，也不能推断历史 B1 操作 |
| Effective Packet | undetermined | 候选中存在文件；没有图 1 身份链，未作语义归因 |
| 正式 Prompt / Provider Prompt | undetermined | 候选中存在编译与 payload 文件；未摘录替代图 1 实际请求 |
| subtype / shot / 节点 / 人物行为 | undetermined | 候选 task 是 reception / entrance_view，resolved view 为 reception_arrival_view；这些不是图 1 参数 |

逐阶段结论：项目输入、分析提案、B1、方向确认、编译、镜头选择、模型执行，**均不足以确认是图 1 的偏差发生点**。不能把候选成功运行、null 方向快照、历史 Golden，或下述合成字段丢失转换成实际图 1 根因。

当前项目索引中的 ready/missing 状态只表示读取时的状态，不能倒推运行时分析不可用。本轮未重新分析、编译、验证或生成本地用户项目。候选 implementation digest 只作为记录索引，不据此认证 P7B 策略或质量。

## 后续补证

恢复实际归因前，需要图 1 对应的 Masterpiece 原始输出或可验证的派生链（原始图哈希、生成 Run ID、导出/编辑关联记录）。随后只对匹配的运行串联输入、原 Packet、B1 来源、方向指纹与确认、Effective Packet、正式和 Provider Prompt，以及实际镜头和行为节点。当前停止该归因，不做推测修复。

本轮只提交非敏感身份索引、缺口和合成证据；不提交图片、项目 JSON、分析报告、真实 Prompt/payload 或运行原始记录。机器证据摘要见 `RKS-01E-evidence-index.json`；独立合成实验见 `RKS-01E-field-loss-diagnosis.md`。

## 离线验证与交付范围

独立工作流完整顶层 JS/TS 测试、methodology 与 restaurant-knowledge 测试共 **150/150 PASS**；其中包括新字段溯源诊断、B1 建议、方向确认、跨区 scope、P7 布局、标准及参考图路径、基线保护与校验策略测试。`npm run golden:test` 五项 PASS，Provider calls=0，Golden auto-updated=NO；其中历史人工验收标记只是既有记录，不构成本轮新视觉验收。

`npm run repo:verify` PASS，包含 `verify:current-flows`、隔离检查及 56 项 guard 测试。日志位于 ignored 的 `.codex-smoke/rks-01e/`；不纳入 Git。受保护源文件、旧合成证据、知识卡和修正草案摘要对起点核对一致。候选运行的六项身份核验文件在最终验证前后摘要相等；这是检查过的有限文件集合，不冒充整个用户数据根目录的任务前后快照。

验证波动保留：前两次完整 repo:verify 通过；暂存后的复核在既有 `document-context-service.test.ts:300` 的取消轮询断言失败一次（Runtime application 1293/1294）。该用例单独复跑通过，随后完整 repo:verify 重跑通过；未修改相关生产代码或测试。表现符合时序波动，但具体原因未确认。失败日志 `staged-repo-verify.log` 和通过日志 `staged-repo-verify-recheck.log` 均保留本地，不把单例复跑替代完整门禁。

本轮真实分析 **0**、真实生图 **0**、真实校验 **0**、自动重试 **0**。生产实现、P7B/B1 行为、Seedream 配置、Golden、历史验收、用户项目记录未修改。完成后停止，等待人工审核；不合并、不发布、不部署。
