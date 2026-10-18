# 包外字节一致性测试：具体变更申请

状态：用户已分别批准原始申请和派生计数补充申请，均按原范围实施。依据本轮用户第 5 项要求，先提交变更范围，继续独立完成生产修正、摘要审计和其余验证。

唯一申请路径：`tests/runtime-application/visual-workflow-isolation.test.ts`。唯一申请用例：`owned standard compilation ignores global mode flags and preserves extracted prompt/payload bytes`。不改其它测试、共享实现、Golden 或完整性验证器。

旧语义：独立编译输出和 payload 必须与共享提取实现逐字一致。这与两批已经批准的色彩权限、构图焦点、镜头范围和锚点权限变更冲突；共享实现没有获得相同业务变更授权，不能以修改共享实现满足旧断言。

必须保留的契约：忽略全局 compiler mode；独立标准路由固定；相同独立输入产生相同 Prompt 与 payload；Provider 除 Prompt 外的请求字段保持同等协议形状；不隐式注入参考图片。申请只调整比较对象及获准改变的 Prompt 字节。

具体差异：

```diff
   const upstream = sharedCompile({projectContext:context,task});
+  const ownedUnderProductionFlag = isolatedCompile({projectContext:context,task});
   process.env.MASTERPIECE_SPACE_COMPILER_MODE='vnext_legacy';
   assert.equal(resolveSpaceCompilerMode(),'r8_6_golden');
   const owned = isolatedCompile({projectContext:context,task});
-  assert.equal(owned.compiledPrompt.finalPrompt,upstream.compiledPrompt.finalPrompt);
-  assert.deepEqual(owned.payload,upstream.payload);
+  assert.equal(owned.compiledPrompt.finalPrompt,ownedUnderProductionFlag.compiledPrompt.finalPrompt);
+  assert.deepEqual(owned.payload,ownedUnderProductionFlag.payload);
+  assert.notEqual(owned.compiledPrompt.finalPrompt,upstream.compiledPrompt.finalPrompt);
+  assert.deepEqual({...owned.payload,prompt:upstream.payload.prompt},upstream.payload);
+  assert.ok(owned.payload.prompt.endsWith(owned.compiledPrompt.finalPrompt));
+  assert.equal(owned.payload.image,undefined);
```

申请同时将此用例名称改为 `owned standard compilation ignores global mode flags and preserves independent payload contracts`，准确表达最终契约。没有外部快照更新，没有删除用例，没有扩大到无关断言。若不批准，保留当前失败并如实记录，不能宣称完整门禁已恢复。

## 执行后发现的 Prompt 派生计数字段：补充申请

实际 payload 还含 `referenceBoundary.promptCharacters`，它计数完整 Prompt；已批准的 Prompt 改变必然使此计数不同。申请仅再规范化这个派生字段做共享协议比较，并独立断言其等于独立 Prompt 的 Unicode 字符数。`referenceBoundary.applied/version/providerStrengthControl` 等所有其他字段继续原值逐项比较。

```diff
- assert.deepEqual({...owned.payload,prompt:upstream.payload.prompt},upstream.payload);
+ assert.equal(owned.payload.referenceBoundary.promptCharacters,[...owned.compiledPrompt.finalPrompt].length);
+ assert.deepEqual({...owned.payload,prompt:upstream.payload.prompt,
+   referenceBoundary:{...owned.payload.referenceBoundary,promptCharacters:upstream.payload.referenceBoundary.promptCharacters}},upstream.payload);
```

该补充获批前不修改对应比较，不跳过计数一致性要求。
