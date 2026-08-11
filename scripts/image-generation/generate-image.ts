/**
 * 生图功能 V1：Headless CLI（§15）。
 *
 * Desktop 接入前的唯一验证入口。只编译已有结论，不重新分析项目。
 *
 * 用法：
 *   npm run generate:image -- \
 *     --project "冯烫烫" \
 *     --reference-run "<referenceRunId>" \
 *     --output master_anchor_image [--dry-run]
 *
 * 可选：--model --region --size --dry-run --prompt-file --logo --data-path
 *       --project-id <uuid>  --api-key <key>  --base-url <url>
 *       --retry <runId> --mode same_prompt|edited_prompt
 *
 * 凭据解析：--api-key > 环境变量 MASTERPIECE_DASHSCOPE_API_KEY。
 * Headless tooling reads credentials only from explicit arguments or environment variables.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createImageGenerationService,
  type ImageGenerationServiceDeps,
} from '@masterpiece/runtime-core/application/image-generation/service.ts';
import { createFileContextLoader } from '@masterpiece/runtime-core/application/image-generation/context-loader.ts';
import type { ImageGenerationRun } from '@masterpiece/runtime-core/application-contracts.ts';

interface CliArgs {
  project?: string;
  projectId?: string;
  referenceRun?: string;
  output: string;
  model?: string;
  region?: string;
  size?: string;
  dryRun: boolean;
  promptFile?: string;
  logo?: string;
  dataPath?: string;
  apiKey?: string;
  baseUrl?: string;
  retry?: string;
  mode: 'same_prompt' | 'edited_prompt';
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { output: 'master_anchor_image', dryRun: false, mode: 'same_prompt' };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = () => argv[(i += 1)];
    switch (token) {
      case '--project': args.project = next(); break;
      case '--project-id': args.projectId = next(); break;
      case '--reference-run': args.referenceRun = next(); break;
      case '--output': args.output = next(); break;
      case '--model': args.model = next(); break;
      case '--region': args.region = next(); break;
      case '--size': args.size = next(); break;
      case '--dry-run': args.dryRun = true; break;
      case '--prompt-file': args.promptFile = next(); break;
      case '--logo': args.logo = next(); break;
      case '--data-path': args.dataPath = next(); break;
      case '--api-key': args.apiKey = next(); break;
      case '--base-url': args.baseUrl = next(); break;
      case '--retry': args.retry = next(); break;
      case '--mode': {
        const value = next();
        args.mode = value === 'edited_prompt' ? 'edited_prompt' : 'same_prompt';
        break;
      }
      case '--help':
      case '-h': printUsageAndExit(0); break;
      default:
        if (token.startsWith('--')) {
          process.stderr.write(`未知参数：${token}\n`);
          printUsageAndExit(1);
        }
    }
  }
  return args;
}

function printUsageAndExit(code: number): never {
  process.stdout.write(
    [
      '生图功能 Headless CLI',
      '',
      '  --project <名称>           按项目名解析（或用 --project-id）',
      '  --project-id <uuid>        直接指定项目 ID',
      '  --reference-run <runId>    已批准的 Reference Anchor 运行 ID',
      '  --output <type>            默认 master_anchor_image',
      '  --dry-run                  只编译 + Gate + Payload 预览，不调用模型',
      '  --model / --region / --size',
      '  --prompt-file <path>       重试改写 Prompt 时读取',
      '  --logo <path>              显式指定 Logo 资产',
      '  --data-path <dir>          覆盖数据根目录',
      '  --api-key <key>            覆盖 API Key（否则读 MASTERPIECE_DASHSCOPE_API_KEY）',
      '  --base-url <url>           覆盖 DashScope Base URL',
      '  --retry <runId> --mode same_prompt|edited_prompt',
      '',
    ].join('\n'),
  );
  process.exit(code);
}

function defaultDataPath(): string {
  const appData = process.env.APPDATA
    || (process.env.HOME ? path.join(process.env.HOME, 'AppData', 'Roaming') : process.cwd());
  return path.join(appData, 'masterpiece-os-desktop', 'Masterpiece OS Data');
}

/** 直接扫描 projects 目录下各 project.json 解析项目 ID（避免依赖 Electron 的 project-store）。 */
async function resolveProjectId(dataPath: string, name?: string, explicitId?: string): Promise<string> {
  if (explicitId) return explicitId;
  if (!name) throw new Error('必须提供 --project <名称> 或 --project-id <uuid>');
  const projectsRoot = path.join(dataPath, 'projects');
  const entries = await fs.readdir(projectsRoot, { withFileTypes: true }).catch(() => []);
  const matches: Array<{ id: string; projectName: string }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const record = JSON.parse(
        await fs.readFile(path.join(projectsRoot, entry.name, 'project.json'), 'utf8'),
      ) as { id?: string; projectName?: string; detectedProjectName?: string };
      const candidateNames = [record.projectName, record.detectedProjectName].filter(Boolean) as string[];
      if (record.id && candidateNames.some((value) => value === name)) {
        matches.push({ id: record.id, projectName: record.projectName ?? name });
      }
    } catch { /* 跳过损坏目录 */ }
  }
  if (matches.length === 0) throw new Error(`未找到名为「${name}」的项目（在 ${projectsRoot}）。`);
  if (matches.length > 1) {
    throw new Error(`名为「${name}」的项目有多个，请用 --project-id 指定：${matches.map((m) => m.id).join(', ')}`);
  }
  return matches[0].id;
}

function printSummary(run: ImageGenerationRun): void {
  const lines: string[] = [];
  lines.push('');
  lines.push('════════ 运行摘要 ════════');
  lines.push(`runId        : ${run.runId}`);
  lines.push(`projectId    : ${run.projectId}`);
  lines.push(`status       : ${run.status}`);
  lines.push(`provider     : ${run.providerId} / ${run.modelId} @ ${run.region}`);
  if (run.providerTaskId) lines.push(`providerTask : ${run.providerTaskId}`);
  const gate = run.gate;
  if (gate) {
    lines.push(`gate.blocked : ${gate.blocked}`);
    lines.push(`gate.errors  : ${gate.errors.length}`);
    for (const err of gate.errors) lines.push(`   ✗ [${err.code}] ${err.message}`);
    lines.push(`gate.warnings: ${gate.warnings.length}`);
    for (const warn of gate.warnings.slice(0, 5)) lines.push(`   ⚠ [${warn.code}] ${warn.message}`);
  }
  if (run.errorCode) lines.push(`error        : [${run.errorCode}] ${run.errorMessage ?? ''}`);
  if (run.images?.length) {
    lines.push(`images       : ${run.images.length}`);
    for (const img of run.images) lines.push(`   → ${img.localPath}`);
  }
  lines.push('══════════════════════════');
  process.stdout.write(`${lines.join('\n')}\n`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const dataPath = path.resolve(args.dataPath || process.env.MASTERPIECE_DATA_PATH || defaultDataPath());
  process.stdout.write(`[generate:image] 数据根目录：${dataPath}\n`);

  const projectId = await resolveProjectId(dataPath, args.project, args.projectId);
  const loader = createFileContextLoader(dataPath);

  const deps: ImageGenerationServiceDeps = {
    loadContext: (input) => loader.loadContext(input),
    dataPath,
    emitRunUpdated: (progress) => {
      process.stdout.write(`  · [${progress.status}] ${progress.message}\n`);
    },
    // Headless tooling intentionally accepts only environment variables / --api-key.
    ...(args.apiKey ? { readCredentials: async () => ({ apiKey: args.apiKey as string }) } : {}),
  };
  const service = createImageGenerationService(deps);

  let run: ImageGenerationRun;
  if (args.retry) {
    const editedPrompt = args.mode === 'edited_prompt' && args.promptFile
      ? await fs.readFile(path.resolve(args.promptFile), 'utf8')
      : undefined;
    run = await service.retry({
      runId: args.retry,
      mode: args.mode,
      editedPrompt,
      apiKey: args.apiKey,
      dryRun: args.dryRun,
    });
  } else {
    if (!args.referenceRun) throw new Error('必须提供 --reference-run <referenceRunId>');
    run = await service.start({
      projectId,
      referenceAnchorRunId: args.referenceRun,
      outputType: 'master_anchor_image',
      modelId: args.model,
      region: args.region as ImageGenerationRun['region'] | undefined,
      size: args.size,
      apiKey: args.apiKey,
      baseUrl: args.baseUrl,
      logoAssetPath: args.logo,
      dryRun: args.dryRun,
    });
  }

  printSummary(run);
  // 退出码：blocked / failed 视为失败，便于 CI 判定
  if (run.status === 'blocked' || run.status === 'failed') process.exitCode = 2;
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    process.stderr.write(`[generate:image] 失败：${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}

export { main, parseArgs, resolveProjectId };
