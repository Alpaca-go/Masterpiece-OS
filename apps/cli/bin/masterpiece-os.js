#!/usr/bin/env node
import path from 'node:path';
import { runAnalysisPipeline } from '../src/analysis-engine/bootstrap.js';
import { inventoryProject } from '../src/inventory.js';
import { createDefaultAnalysisProviderRegistry } from '@masterpiece/model-runtime/analysis-provider-registry.js';
import { getCurrentProviderPolicy } from '@masterpiece/runtime-core/application/provider-policy.js';

const HELP = `Masterpiece OS — Visual Analysis

用法：
  masterpiece-os analyze <素材目录> [--output <目录>] [--config <分析配置>]
  masterpiece-os inventory <素材目录> [--json]
  masterpiece-os help

命令：
  analyze    运行 Visual Analysis 单次推理流程
  inventory  盘点 ZIP、PDF、PPT/PPTX、图片及常用文本素材

选项：
  --language         输出语言：zh-CN（默认）或 en
  --lock             项目级额外锁定资产；可重复或用逗号分隔
  --allow-logo-redesign  显式授权 Logo 重设计；默认关闭
  --required-app     必须覆盖的应用；可重复或用逗号分隔
  --provider         显式 Reasoner Provider：qwen / volcengine (或 MASTERPIECE_PROVIDER)
                     未指定时使用运行时 Provider Policy 的 default（当前 = volcengine）
  --force-reasoning  跳过精确推理缓存并执行一次新推理
  -o, --output       输出目录；默认 <项目根>/outputs
  -c, --config       分析配置文件；默认 masterpiece-os-v5.json（兼容文件名）
  --json             inventory 命令输出 JSON
`;

function parseArgs(args) {
  const positional = [];
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json' || arg === '--force-reasoning' || arg === '--allow-logo-redesign') {
      const key = arg === '--json' ? 'json' : arg === '--force-reasoning' ? 'forceReasoning' : 'allowLogoRedesign';
      options[key] = true;
    } else if (arg === '--lock' || arg === '--required-app') {
      const value = args[++i];
      if (!value || value.startsWith('-')) throw new Error(`${arg} 缺少参数值`);
      const key = arg === '--lock' ? 'lockedAssets' : 'requiredApplications';
      options[key] = [...(options[key] || []), ...value.split(',').map((item) => item.trim()).filter(Boolean)];
    } else if (['--output', '-o', '--config', '-c', '--language', '--provider'].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith('-')) throw new Error(`${arg} 缺少参数值`);
      const key = ({ '--output': 'output', '-o': 'output', '--config': 'config', '-c': 'config', '--language': 'language', '--provider': 'provider' })[arg];
      options[key] = value;
    } else if (arg.startsWith('-')) {
      throw new Error(`未知选项：${arg}\n\n${HELP}`);
    } else {
      positional.push(arg);
    }
  }
  return { positional, options };
}

// A3-G: CLI Resolver. Resolves the Analysis Provider reasoner through
// the SAME registry the Web Runtime uses. There is no `if selected
// === 'qwen' { ... }` / `if selected === 'volcengine' { ... }`
// branch in this CLI; the registry's `supports()` predicate (driven
// by `provider` field + `model` prefix) is the single dispatch
// point. The default falls back to `getCurrentProviderPolicy().default`
// (currently `volcengine / doubao-seed-2.1-turbo`).
//
// Returns `{ reasoner, source }` where `source` is one of:
//   - 'injected'        : caller supplied a ready-to-use reasoner
//   - 'injected-factory': caller supplied a reasoner factory
//   - 'explicit-override': CLI --provider / MASTERPIECE_PROVIDER used
//   - 'policy-default'  : no override; policy default used
function resolveReasoner(options) {
  if (typeof options.deepCreativeDirectorReasoner === 'function') {
    return { reasoner: options.deepCreativeDirectorReasoner, source: 'injected' };
  }
  if (typeof options.deepCreativeDirectorReasonerFactory === 'function') {
    return { reasoner: options.deepCreativeDirectorReasonerFactory(), source: 'injected-factory' };
  }

  const policy = getCurrentProviderPolicy();
  const registry = createDefaultAnalysisProviderRegistry();

  // Resolve the override (if any) and the default through the SAME
  // registry. The configuration is forwarded as-is; the registry
  // only inspects `provider` and `model` (plus optional apiKey /
  // baseUrl passthrough to the adapter factory).
  const selectedProvider = String(
    options.provider || process.env.MASTERPIECE_PROVIDER || '',
  ).trim().toLowerCase();

  if (selectedProvider) {
    // Manual override: explicit-run wins over policy default
    // (per A3 spec §8: explicit-run > user-profile > system-default).
    try {
      const provider = registry.resolve({
        provider: selectedProvider,
        model: options.model || undefined,
      });
      return {
        reasoner: provider.createReasoner({
          provider: selectedProvider,
          model: options.model || undefined,
        }),
        source: 'explicit-override',
      };
    } catch (error) {
      const wrapped = new Error(`不支持的 Reasoner Provider：${selectedProvider}（${error.message}）`);
      wrapped.code = 'REASONER_PROVIDER_UNSUPPORTED';
      throw wrapped;
    }
  }

  // No override — use the policy default. Pass the canonical
  // policy.default to the registry; the registry's `supports()`
  // predicate (model-prefix dispatch) routes to the right adapter.
  const { provider, model } = policy.default;
  const defaultAdapter = registry.resolve({ provider, model });
  return {
    reasoner: defaultAdapter.createReasoner({ provider, model }),
    source: 'policy-default',
  };
}

async function main(args) {
  const [command, ...rest] = args;
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }
  const { positional, options } = parseArgs(rest);
  if (command === 'inventory') {
    if (positional.length !== 1) throw new Error('inventory 需要一个素材目录');
    const inventory = await inventoryProject(path.resolve(positional[0]));
    if (options.json) console.log(JSON.stringify(inventory, null, 2));
    else console.log(`素材 ${inventory.totalFiles} 个，其中图片 ${inventory.imageCount} 张`);
    return;
  }
  if (command === 'analyze') {
    if (positional.length !== 1) throw new Error('analyze 需要一个素材目录');
    const pipelineOptions = { ...options };
    if (!pipelineOptions.deepCreativeDirectorReasoner
        && !pipelineOptions.deepCreativeDirectorReasonerFactory) {
      const { reasoner } = resolveReasoner(pipelineOptions);
      pipelineOptions.deepCreativeDirectorReasoner = reasoner;
    }
    const { result, output } = await runAnalysisPipeline(positional[0], pipelineOptions);
    console.log('Masterpiece OS — Visual Analysis');
    console.log(`素材 ${result.inventory.totalFiles} 个，其中图片 ${result.inventory.imageCount} 张`);
    console.log(`Creative Authority：${result.creativeAuthority}`);
    console.log(`Locked Visual Assets：${result.lockedVisualAssets.join('、') || '无（已显式授权 Logo 重设计）'}`);
    console.log(`Reasoning Run：${result.creativeDirector.runId}（${result.runReport.fullReasoningRuns} 次完整推理）`);
    console.log(`输出文件：${result.outputFile}`);
    console.log(`运行记录：${result.runtimeReportPath}`);
    console.log(`输出目录：${output}`);
    return;
  }
  throw new Error(`未知命令：${command}\n\n${HELP}`);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`错误：${error.message}`);
  if (process.env.DEBUG) console.error(error.stack);
  process.exitCode = 1;
});
