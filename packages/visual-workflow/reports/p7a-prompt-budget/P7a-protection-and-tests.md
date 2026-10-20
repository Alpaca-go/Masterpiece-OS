# P7a 保护与测试

[保护证明](P7a-protection-proof.json)核对23个既有目录逐文件不变，覆盖P7确认项目与报告、P5/P6图像及旧副本、正式源项目。基线021a6b6673c5300ae54da8280afdd62aca3b2e1c，分支fix/jiuzhou-final-spatial-balance，起点工作区干净；所有生产tracked代码、Compiler/Adapter/Schema/预算/截断、Golden、完整性和历史验收记录无改动。

新副本仅方向记录及其历史、image-generation-vnext下本轮编译/会话相关文件发生变化，原项目记录、输入素材和原分析Context不变。49项新增/变化文件完整列于保护证明；保留3次编译的产物，没有覆盖失败迭代。编译保真失败后无Provider dispatch；最终仅一个内存fetch fixture请求，质量校验未运行、自动重试0。

归档脚本首次误以image-generation为副本生成目录名，遇到实际持久化兼容目录image-generation-vnext时拒绝；核实后修正仅本地审计范围并重新逐项通过，没有修改产品、旧文件或测试断言。

[完整工程门禁](P7a-gate-results.json)：TS82/82、JS30/30、医美/餐饮/酒店标准Adapter body三行业逐值一致、Golden PASS且不刷新、repo:verify PASS（含current-flows 1294及仓库/隔离反例56）。命令、退出码、日志原摘要与归档日志均可核对。本轮仅项目数据与报告，没有共享宿主/路由/样式/依赖影响；没有重新分析、真实模型、合成、合并发布。

Golden中的VISUAL_MANUAL_ACCEPTED属于既有样本标签，不是P7a的新视觉验收。回归通过也不证明生图模型稳定遵守布局。
