# RKS-02B 冯烫烫项目级离线验收包

B 的商业定位已在完整餐饮输入中对齐确认目标，但完整生成输入仍未通过生图前验收。外立面作用域、入口网络投影、通用模板气质和未审核材料参数仍需处理。本阶段完成离线证据与验证，生产修复仅提交提案。

起点：`codex/rks-restaurant-direction-shadow` / `3b02af4859eecb189b593b11bc81ab27cf6c3228`。工作分支：`codex/rks-ftt-direction-fidelity`。开始时 Git 工作树干净，严格从该提交创建分支；没有合并、发布或部署。

交付入口：

- [历史完整 Packet 字节副本](../../tests/restaurant-knowledge/ftt-historical-packet.json)及[Fixture 构造器](../../tests/restaurant-knowledge/ftt-fidelity-fixture.ts)：使用完整历史餐饮输入，保留原项目 GUID；不是图 1 的 Run 重建。
- [来源、完整 A/B 输入与差异账本](fixture-provenance.json)：原始 SHA256、来源分层、共同文字后期合成适配、全部 B 方向变更、未知项与只读 B1 投影。
- [设计师 A/B 对照](AB-review.md)：八维设计方向、保留情况、剩余错误、同质化风险及三镜头完整正式/Provider Prompt。
- [餐饮语义污染检查](semantic-audit.md)及[字段级编译证据](compiled-evidence.json)。
- [项目级知识审核](knowledge-review.md)、[六类反例及额外非四川案例](cross-project-results.json)。原六类输入未变，另增加日本料理边界案例；各案都显式尝试注入 FTT 材料/经营知识并被隔离。
- [生图前人工清单](human-checklist.md)与[下一阶段独立生产变更申请](protected-change-proposal.md)。
- [保护证据](evidence-index.json)与[完整回归报告](regression-results.md)。

实验契约：A/B 从同一历史 Packet 派生，A 仅施加双方共同的硬可见文字适配；B 通过可重放差异账本修改方向。除登记的方向差异，完整输入一致。同一镜头内任务逐字相同；分别采用 entrance/entrance_view、storefront/front、dining/three_quarter_wide。Seedream 5.0 Pro、standard、16:9、2K、1 张、零参考图、post_composite 保持一致。B 只在副本中显式选用项目观察，不自动调用 RKS 或生产 B1。

代码全部位于测试目录，报告位于本目录；没有新增生产入口。复现使用 Node/tsx，不需要凭据：

```powershell
node --import tsx packages/visual-workflow/tests/restaurant-knowledge/ftt-fidelity-evidence.ts
node --import tsx --test packages/visual-workflow/tests/restaurant-knowledge/ftt-fidelity.test.ts
$restaurantTests = @(rg --files packages/visual-workflow/tests/restaurant-knowledge | Where-Object { $_ -match '\.test\.(js|ts|mjs)$' })
node --import tsx --test @restaurantTests
$workflowTests = @(rg --files packages/visual-workflow/tests | Where-Object { $_ -match '\.test\.(js|ts|mjs)$' })
node --import tsx --test @workflowTests
npm run repo:verify
npm run golden:test
```

证据生成器只读取仓库已有历史材料及测试副本，使用纯编译和 compileRequest 格式化，不调用 execute；完整生成流程没有启动。网络哨兵记录 0 次尝试。真实分析、真实生图、模型校验、自动重试均 0；未读凭据、未访问或写入用户真实项目，未上传参考图。

141 项源码/完整性清单/来源文件逐字节与起点一致；受保护根目录 Git 差异为空。正式 B1、P7B、Seedream 配置、Golden、Prompt Hash、人工验收、完整性摘要、RKS 原实现/知识状态和根因矩阵未修改。实验中的 Prompt SHA256 仅为新实验输出的可核对值，不是刷新任何既有冻结摘要。

本轮不认定冯烫烫视觉质量通过，图 1 实际 Run 关联仍为 undetermined。材料知识维持 candidate / project_observation，未自动晋升。完成后停止，等待人工审核。
