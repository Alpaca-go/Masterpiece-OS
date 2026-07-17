# 文档功能发布检查门

任何涉及 PDF、DOCX、Markdown、文本解析，Brand DNA 结构化分析，Checkpoint 或报告生成的修改，在提交和生成客户端前必须运行：

```powershell
npm run verify:document-flows
```

该检查门固定覆盖：

1. 文档导入、解析、去重和原始文件名保留；
2. Brand DNA v2 与 v3 的完整模拟流程；
3. JSON 语法修复、字段类型偏差、输出截断和 Schema 失败；
4. 核心报告保底、阶段 Checkpoint、恢复执行和完整报告；
5. Desktop 数据契约与 TypeScript 检查。

检查只使用本地 Fixture 和模拟模型，不读取 API Key，也不调用任何外部模型。检查失败时不得生成或交付新版 `.exe`。
