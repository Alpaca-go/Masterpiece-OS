# 九州美学 Golden Prompt 反向审计基准

本目录冻结 Golden Prompt 反向审计所需的文本基准。Golden Prompt 原文不得自动压缩、润色、重写或替换。

## 已冻结文件

- `golden-prompt.md`：人工验证通过的 Golden Prompt。
- `current-analysis-report.md`：重构前的真实分析报告。
- `current-masterpiece-prompt.txt`：重构前由 Masterpiece 编译的空间 Prompt。
- `audit-matrix.json`：22 个 Golden 原子信息及首次失真节点。
- `visual-fixture-manifest.json`：本地原视觉方案、真实 Logo、失败图和成功图的校验清单。

## 本地视觉样本

大体积二进制样本位于仓库根目录下被 Git 忽略的 `docs/九州美学垂直测试/`。运行人工视觉验收前，应先执行：

```powershell
node scripts/validation/verify-jiuzhou-golden-baseline.mjs
```

脚本会核对 Golden Prompt、真实 Logo、3 张失败图、3 张成功图、27 张原视觉方案的数量与 SHA-256，不调用模型。

## 基准结论

当前分析报告首次把行业与商业角色判断错，后续创意命题、抽象和空间转译随之偏移。当前 Prompt Compiler 又把 Locked Logo 规则误映射为 Upgrade Thesis 和 Brand Translation，并用通用占位句填充色彩、材料和光线。因此修复顺序必须从事实与诊断开始，不能只在最终 Prompt 追加九州专属词。
