import path from 'node:path';
import fs from 'node:fs/promises';
import { inventoryProject } from './inventory.js';
import { runV4Pipeline } from './v4-bootstrap.js';
import { initializeProject, formatInitializationSummary } from './project-initializer.js';
import { selectProject } from './project-selector.js';
import { ensureDir, writeText } from './utils.js';
import { formatPerformanceProfile } from './performance-profiler.js';
import { formatValidationCheck, validateProjectDelivery } from './validation-check.js';

const HELP = `Masterpiece-OS v4.0 — AI Creative Director Operating System

用法：
  masterpiece-os analyze --project <项目名称> [--mode quick|standard|studio] [--online] [--profile]
  masterpiece-os analyze <素材目录> [--output <目录>] [--config <文件>] [--mode <模式>]
  masterpiece-os validate --project <项目名称>
  masterpiece-os inventory <素材目录> [--json]
  masterpiece-os init <项目目录> [--name <品牌名>]
  masterpiece-os help

命令：
  analyze    运行可测量的品牌理解与 Creative Brief Pipeline
  validate   运行毫秒级项目交付检查，不执行完整开发测试
  inventory  盘点 ZIP、PDF、PPT/PPTX、图片及常用文本素材
  init       创建独立项目配置模板和 assets 目录

Creative Pipeline：
  Assets → Brand Understanding → Industry Benchmark → Creative Decision State → Compiler Pipeline → Outputs

Standard / Studio 固定输出：
  01-Analysis.md
  02-Creative-Brief.md
  03-Design-Decisions.md
  04-Design-Review.md

Quick 仅输出：
  02-Creative-Brief.md

选项：
  --project          projects/ 下的一级项目名称；只有一个项目时可省略
  --project-brief    可选的项目级执行 Brief；默认自动读取项目根目录或 docs/Project Brief.md
  -o, --output       直接素材目录模式的输出目录；项目模式固定写入项目 outputs/
  -c, --config       JSON 配置文件；项目模式默认读取项目根目录 masterpiece-os.json
  --mode             quick、standard（默认）或 studio
  --online           联网检索对标候选；失败时使用内置案例库
  --debug            额外输出 masterpiece-os-result.json 与 debug/performance.json
  --profile          兼容选项：写入 debug/performance.json；耗时默认显示在控制台
  --json             inventory 命令输出 JSON
`;

function parseArgs(args) {
  const positional = [];
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--online' || arg === '--json' || arg === '--debug' || arg === '--profile') options[arg.slice(2)] = true;
    else if (arg === '--quick') options.mode = 'quick';
    else if (arg === '--standard' || arg === '--review') options.mode = 'standard';
    else if (arg === '--studio' || arg === '--research') options.mode = 'studio';
    else if (['--output', '-o', '--config', '-c', '--name', '--thinking-dir', '--knowledge-dir', '--history-dir', '--project', '--project-brief', '--mode'].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith('-')) throw new Error(`${arg} 缺少参数值`);
      const key = ({
        '--output': 'output', '-o': 'output', '--config': 'config', '-c': 'config', '--name': 'name',
        '--thinking-dir': 'thinkingDir', '--knowledge-dir': 'thinkingDir', '--history-dir': 'historyDir',
        '--project': 'project', '--project-brief': 'projectBrief', '--mode': 'mode'
      })[arg];
      options[key] = value;
    } else if (arg.startsWith('-')) throw new Error(`未知选项：${arg}`);
    else positional.push(arg);
  }
  return { positional, options };
}

function initialConfig(name) {
  return {
    projectName: name,
    projectType: '待确认',
    industry: '待确认',
    brand: {
      name,
      primaryColor: null,
      secondaryColors: [],
      fonts: [],
      fontTemperament: '',
      packaging: [],
      coreVisualAssets: []
    },
    benchmarks: [],
    commonTraits: [],
    visualInspection: {
      verified: false,
      inspectedImageCount: 0,
      inspectedImages: [],
      findings: []
    },
    brandDnaDecision: {
      originalIntent: { statement: '', evidence: [] },
      industryBenchmark: { observations: [], opportunities: [], references: [] },
      creativeDecision: { statement: '', rationale: [], tradeoffs: [] },
      approvedBrandDNA: {
        logo: '', color: '', typography: '', composition: '', whitespace: '', photography: '',
        materials: '', packaging: '', craft: ''
      },
      approval: { status: 'draft', approvedBy: '', approvedAt: '' }
    },
    creativeReasoning: {
      brandIdentity: { statement: '', evidence: [] },
      brandPositioning: { statement: '', evidence: [] },
      designLanguage: { statement: '', rationale: [], principles: [] },
      emotionalDirection: { statement: '', desiredFeelings: [], avoidFeelings: [], evidence: [] },
      photographyDirection: { lighting: '', framing: '', depth: '', materials: '', atmosphere: '' },
      designRisks: [],
      mustKeep: [],
      canExplore: [],
      designGoal: ''
    }
  };
}

function printPerformance(performance) {
  console.log(formatPerformanceProfile(performance));
}

async function createStandaloneProject(dir, name) {
  const root = path.resolve(dir);
  await ensureDir(path.join(root, 'assets'));
  const configFile = path.join(root, 'masterpiece-os.json');
  try {
    await fs.access(configFile);
    throw new Error(`配置已存在，未覆盖：${configFile}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await writeText(configFile, `${JSON.stringify(initialConfig(name || path.basename(root)), null, 2)}\n`);
  return configFile;
}

export async function main(args) {
  const command = args[0] || 'help';
  const { positional, options } = parseArgs(args.slice(1));
  if (['help', '--help', '-h'].includes(command)) {
    console.log(HELP);
    return;
  }
  if (command === 'init') {
    if (!positional[0]) throw new Error('请提供项目目录');
    console.log(`已创建：${await createStandaloneProject(positional[0], options.name)}`);
    return;
  }
  if (command === 'inventory') {
    if (!positional[0]) throw new Error('请提供素材目录');
    const result = await inventoryProject(positional[0]);
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`文件：${result.totalFiles}，图片：${result.imageCount}，大小：${result.totalBytes} bytes`);
      for (const [type, count] of Object.entries(result.byType)) console.log(`- ${type}: ${count}`);
    }
    return;
  }
  if (command === 'validate') {
    if (positional.length > 1) throw new Error('validate 最多接受一个项目目录');
    if (positional[0] && options.project) throw new Error('不能同时使用项目目录和 --project');
    const projectRoot = positional[0]
      ? path.resolve(positional[0])
      : (await selectProject({ projectName: options.project })).projectRoot;
    const result = await validateProjectDelivery(projectRoot);
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(formatValidationCheck(result));
    if (result.status !== 'PASS') process.exitCode = 1;
    return;
  }
  if (command === 'analyze') {
    if (positional.length > 1) throw new Error('analyze 最多接受一个素材目录');
    if (positional[0] && options.project) throw new Error('不能同时使用素材目录和 --project，请选择一种分析模式');
    let input = positional[0];
    const pipelineOptions = { ...options };
    if (!input) {
      if (options.output) throw new Error('项目模式的输出目录固定为 projects/<项目>/outputs/，不能使用 --output');
      const selected = await selectProject({ projectName: options.project });
      const initialized = await initializeProject(selected.projectRoot, { projectsRoot: selected.projectsRoot });
      console.log(formatInitializationSummary(initialized));
      input = initialized.inputDir;
      pipelineOptions.output = initialized.outputsDir;
      pipelineOptions.projectRoot = selected.projectRoot;
      delete pipelineOptions.project;
      try {
        await fs.access(selected.configFile);
        if (!pipelineOptions.config) pipelineOptions.config = selected.configFile;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    const { result, output } = await runV4Pipeline(input, pipelineOptions);
    console.log(`执行 Brief：${result.projectBrief.path}（${result.projectBrief.source}）`);
    console.log(`v4 Active State：${result.state.meta.decisionId}`);
    console.log(`分析模式：${result.mode}`);
    console.log(`素材 ${result.inventory.totalFiles} 个，其中图片 ${result.inventory.imageCount} 张`);
    console.log(`视觉核验：${result.brandUnderstanding.visualInspection.inspectedImages.length}/${result.inventory.imageCount} 张`);
    console.log(`State Readiness：${result.state.governance.readiness}`);
    console.log(`Creative Freedom：${result.compilation.creativeFreedom.recommendation.freedom}% / ${result.compilation.creativeFreedom.recommendation.mode}`);
    console.log(`输出文件：${result.outputFiles.join('、')}`);
    if (result.validationReport) console.log(`Validation Report：${result.validationReport.filename}`);
    printPerformance(result.performance);
    console.log(`完整交付耗时：${Math.round(result.handoff.handoffDurationMs / 1000)} 秒`);
    console.log(`输出目录：${output}`);
    return;
  }
  throw new Error(`未知命令：${command}\n\n${HELP}`);
}
