# 宿主通道计数：包外测试定点申请

状态：用户已批准此定点测试修正，按下述范围实施；宿主实现未修改。该问题在两批修复之前已记录：宿主实有 256 个通道，旧断言写死全部为 236，独立工作流新增的 20 个 `visual-workflow:*` 通道未被计入。

唯一申请路径：`apps/web-runtime/tests/node-runtime-host.test.ts`。唯一申请用例为首个宿主绑定测试；只更新名称、过时说明和计数断言，不改后续任何 RPC、凭据保护、健康检查、共享宿主或独立业务实现。

```diff
- test('Node Runtime Host binds all 236 channels to the Shared Registry without Electron', async (t) => {
+ test('Node Runtime Host binds shared and independently owned channels without Electron', async (t) => {
...
- assert.equal(host.operationCount, 236);
+ const channels: string[] = host.registry.list();
+ const independentChannels = channels.filter(channel => channel.startsWith('visual-workflow:'));
+ assert.equal(channels.length - independentChannels.length, 236);
+ assert.equal(independentChannels.length, 20);
+ assert.equal(host.operationCount, 256);
+ assert.equal(new Set(channels).size, channels.length);
+ for (const channel of ['visual-workflow:select-logo','visual-workflow:analyze','visual-workflow:compile','visual-workflow:generate']) assert.ok(independentChannels.includes(channel));
```

这保留原 236 个非独立工作流通道的数量约束，并增加独立注册域、总数和唯一性断言；不是移除计数检查或接受任意变化。现有契约中的 registry 拒绝重复、实际 RPC 可达性和凭据不可读测试不变。若不批准，继续记录此项真实失败，不以 repo:check 不包含该测试为由宣称所有测试通过。
