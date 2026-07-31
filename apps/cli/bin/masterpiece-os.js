#!/usr/bin/env node
import path from 'node:path';
import { runV5Pipeline } from '../src/v5/bootstrap.js';
import { inventoryProject } from '../src/inventory.js';
import { createQwenReasoner } from '@masterpiece/model-runtime/qwen-reasoner.js';

const HELP = `Masterpiece-OS v5.0 — Deep Creative Director Preparation System

用法：
  masterpiece-os analyze <素材目录> [--output <目录>] [--config <v5配置>]
  masterpiece-os inventory <素材目录> [--json]
  masterpiece-os help

命令：
  analyze    运行 v5 Deep Creative Director 单次推理 Pipeline
  inventory  盘点 ZIP、PDF、PPT/PPTX、图片及常用文本素材

选项：
  --language         v5 输出语言：zh-CN（默认）或 en
  --lock             项目级额外锁定资产；可重复或用逗号分隔
  --allow-logo-redesign  显式授权 Logo 重设计；默认关闭
  --required-app     必须覆盖的应用；可重复或用逗号分隔
  --provider         Reasoner Provider：qwen（或 MASTERPIECE_PROVIDER）
  --force-reasoning  跳过精确推理缓存并执行一次新推理
  -o, --output       输出目录；默认 <项目根>/outputs
  -c, --config       v5 配置文件；默认 masterpiece-os-v5.json
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

function createReasonerFromEnvironment({ provider, environment = process.env } = {}) {
  const selected = String(provider || environment.MASTERPIECE_PROVIDER || '').trim().toLowerCase();
  if (!selected) {
    const error = new Error('未配置 Reasoner Provider；请使用 --provider 或 MASTERPIECE_PROVIDER');
    error.code = 'REASONER_PROVIDER_MISSING';
    throw error;
  }
  if (selected === 'qwen') return createQwenReasoner({ environment });
  const error = new Error(`不支持的 Reasoner Provider：${selected}`);
  error.code = 'REASONER_PROVIDER_UNSUPPORTED';
  throw error;
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
    const selectedProvider = pipelineOptions.provider || process.env.MASTERPIECE_PROVIDER;
    if (selectedProvider && !pipelineOptions.deepCreativeDirectorReasoner) {
      pipelineOptions.deepCreativeDirectorReasonerFactory = () =>
        createReasonerFromEnvironment({ provider: selectedProvider });
    }
    const { result, output } = await runV5Pipeline(positional[0], pipelineOptions);
    console.log('Masterpiece OS v5.0 — Deep Creative Director Mode');
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
