# 失败逐项归因与未验证范围

状态：STOPPED_DIRECT_SEMANTIC_REGRESSION / BLOCK。停止后只读日志与保存报告；未继续修复或运行测试。

## 本轮新增直接语义回归

- complete positive units reject unrecognized tails, negation, wishes, identity and color：基准PASS→当前FAIL。输入 mustBeVisible=["equipment"] 得到pass，原断言要求block。归属新语义层回归，不归入旧投影G组。

## 50项原有失败（含35项G1–G10）

|原编号|原用例|组|当前证据|
|---|---|---|---|
|1|read-only existing report RPC supplies suggestions for missing directions without creating any decision files|B0|not_run_after_stop|
|2|integrated project direction reaches the standard provider body without a reference input|G1|not_run_after_stop|
|3|project direction alone reaches formal standard request with height, open transition and usable functions|G1|not_run_after_stop|
|4|P1-P4 survive confirmation, projection, formal compilation and the actual standard provider adapter|G1|not_run_after_stop|
|5|open hall, complete service face, single screened threshold and optional cues survive standard provider dispatch|G1|not_run_after_stop|
|6|application service loads confirmation, preserves gates and sends four ordered original byte inputs through actual image adapter|G1|not_run_after_stop|
|7|post-compilation asset edits and missing files fail before any adapter transport|G1|not_run_after_stop|
|8|revocation, authorization change, source directive change and registry role tampering invalidate the execution snapshot|G1|not_run_after_stop|
|9|provider profile model or protocol changes cannot silently execute a compiled reference task|G1|not_run_after_stop|
|10|edited prompts and tampered task snapshots cannot bypass compile or Provider prompt gates|G1|not_run_after_stop|
|11|asset parent junctions and registry traversal fail closed|G1|not_run_after_stop|
|12|public operations verify the approved implementation before registration, compilation, generation and Logo composition|B0|not_run_after_stop|
|13|image service independently rejects reordered or relabeled execution references|G1|not_run_after_stop|
|14|ten unique authorized files are supported; eleven inputs or an empty set are rejected without truncation|G1|not_run_after_stop|
|15|a changed analysis context or a malformed current confirmation blocks instead of silently recompiling|G1|not_run_after_stop|
|16|restrained service cues, unlettered identity carriers, fine edges and diffuse light reach the standard request|G1|not_run_after_stop|
|17|functional movement remains outside geometric actions and material paths retain original indices|G2|not_run_after_stop|
|18|natural-language form values retain independent semantic fields through official standard business compilation|G1|not_run_after_stop|
|19|direction correction replaces the rejected art mechanism and preserves five functional targets through the standard adapter|G1|not_run_after_stop|
|20|baseline lock prevents input/model/code drift and old tasks; other projects remain independent, zero network|B0|not_run_after_stop|
|21|custom preview binds a complete source program to its project without granting a camera|G3|not_run_after_stop|
|22|custom previews retain project geometry, materials, color scope and light without inventing parameters|G3|not_run_after_stop|
|23|glass text in a custom preview cannot become an executable visible owner|G3|not_run_after_stop|
|24|RKS-02C mapped scene formal and Provider prompt hashes, source maps and controls remain identical|G4|not_run_after_stop|
|25|web standard task, effective Packet, official compiler, actual image request and validator share the confirmed direction|G1|not_run_after_stop|
|26|decision changes after compile block dispatch and keep all history|G1|not_run_after_stop|
|27|existing four-image art direction route remains independent and operational|G1|not_run_after_stop|
|28|the plain-language web editor saves and confirms a usable direction without JSON editing|G1|not_run_after_stop|
|29|guarded public web operations save, confirm, compile, generate, reopen and invalidate on an analysis request|B0|not_run_after_stop|
|30|explicit details save persists identity, retains artifacts and requires new analysis/confirmation without calling models|B0|not_run_after_stop|
|31|packages//visual-workflow//tests//restaurant-knowledge//ftt-fidelity.test.ts|G4|not_run_after_stop|
|32|packages//visual-workflow//tests//restaurant-knowledge//ftt-final-design.test.ts|G5|not_run_after_stop|
|33|A/B uses actual B1 projection and pure compilers with controlled synthetic input, no confirmation or transport|G6|not_run_after_stop|
|34|unresolved clauses outside the visible field cannot be hidden by a passing final gate|C1|fail|
|35|formal create/import/analyze via injected provider succeeds with exactly two fake HTTP responses|B0|not_run_after_stop|
|36|formal UVU parse path does not retry after invalid JSON|B0|not_run_after_stop|
|37|formal spatial semantic repair is blocked; existing semantic gate still fails|B0|not_run_after_stop|
|38|formal structured decision repair catches errors but cannot obtain a third dispatch|B0|not_run_after_stop|
|39|formal report validation is not bypassed by two-call budget logic|B0|not_run_after_stop|
|40|source clauses retain exact ranges and mixed local/dependency/review dispositions|C2|fail|
|41|unsafe networks stay reviewable: 点餐制作取餐就餐的完整关系|C3|fail|
|42|unsafe networks stay reviewable: 入口 → 无法确定的节点|C4|fail|
|43|unsafe networks stay reviewable: whole project operating network|C5|fail|
|44|kitchen relationships cannot inherit a boundary authority merely from their container or another entrance clause|G7|fail|
|45|interior sightline request awaits a reviewed interface: 厨师在厨房制作食品并透过临街橱窗玻璃可见|G8|pass|
|46|interior sightline request awaits a reviewed interface: 入口视线可见厨房制作活动|G8|pass|
|47|an exterior prohibition protects interior privacy as a boundary, never as a rendered interior|G9|pass|
|48|explicit off-frame operational prohibitions remain boundary-only|G9|pass|
|49|reference-first target program still replaces source operations instead of inheriting standard fallback|G10|fail|
|50|continuation keeps the target program authoritative and does not expose source dining operations|G10|fail|

not_run_after_stop不等于仍失败或已修复。原定向159项中的跨模块失败只有G7一项与G10两项；C1–C5为原契约争议，单独保留。完整28项未展开初始化依赖沿用已提交审计，不宣称本轮已恢复展开。

## 新增配对测试初次失败

- field contract complete relation or prescription: Kitchen preparation connects to service counter; dining tables remain accessible; takeaway handoff keeps a clear route：Generic English node grammar lacked preparation; added general node noun before original-suite regression. 最后结果PASS；首轮日志保留，未覆盖。
- field contract source clauses retain exact spans and parent scope without confirmation：Generic English node grammar lacked preparation; added general node noun before original-suite regression. 最后结果PASS；首轮日志保留，未覆盖。
- field contract six-field source state cannot become confirmed on completion：New fixture kept a concrete industry value despite marking status unknown; corrected fixture value to unknown before original-suite regression. No original assertion changed. 最后结果PASS；首轮日志保留，未覆盖。
