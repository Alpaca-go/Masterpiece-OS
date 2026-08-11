import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createProjectStore } from '../../src/main/project-store.ts';
import { createPipelineService } from '../../src/main/pipeline-service.ts';
import { createDesktopAnalysisRuntimeAdapter } from '../../src/main/analysis-runtime-adapter.ts';
import { getProviderCredentials, getSettings } from '../../src/main/settings-store.ts';

const sourcePath = process.env.MASTERPIECE_PACKET_SOURCE?.trim();
const textProfileId = process.env.MASTERPIECE_PACKET_TEXT_PROFILE_ID?.trim();
const outputPath = process.env.MASTERPIECE_PACKET_OUTPUT?.trim();
const desktopUserData = process.env.MASTERPIECE_PACKET_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');

app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

function result(value: unknown): void {
  process.stdout.write(`PACKET_RESULT ${JSON.stringify(value)}\n`);
}

async function main(): Promise<void> {
  if (!sourcePath || !textProfileId || !outputPath) {
    throw new Error('缺少 MASTERPIECE_PACKET_SOURCE / MASTERPIECE_PACKET_TEXT_PROFILE_ID / MASTERPIECE_PACKET_OUTPUT');
  }
  const settings = await getSettings();
  const projects = createProjectStore(getSettings);
  const pipeline = createPipelineService(
    projects,
    getProviderCredentials,
    getSettings,
    (progress) => {
      process.stdout.write(`PACKET_PROGRESS ${JSON.stringify({
        stage: progress.stage,
        elapsedMs: progress.elapsedMs,
        model: progress.model,
        assetCount: progress.assetCount,
      })}\n`);
    },
    createDesktopAnalysisRuntimeAdapter(app),
  );

  const created = await projects.create({
    sourcePaths: [sourcePath],
    apiProfileId: textProfileId,
  });
  const projectId = created.id;
  process.stdout.write(`PACKET_PROJECT ${JSON.stringify({ projectId, projectName: created.projectName })}\n`);

  const analysis = await pipeline.start(projectId, true, textProfileId);
  const projectPaths = await projects.paths(projectId);
  const packetPath = path.join(projectPaths.root, 'project-context', 'visual-decision-packet.json');
  const packetRaw = await fs.readFile(packetPath, 'utf8');
  const packet = JSON.parse(packetRaw) as {
    validation?: { executionDataStatus?: string; missingExecutionFields?: string[]; hardFactStatus?: string };
    projectFacts?: { brandName?: { value?: string }; industry?: { value?: string } };
    mediaTranslations?: { spatial?: { status?: string; sceneProgram?: unknown[] } };
    abstractions?: unknown[];
  };
  result({
    projectId,
    projectName: analysis.project.projectName,
    provider: analysis.provider,
    model: analysis.model,
    status: analysis.project.status,
    packetPath,
    brandName: packet.projectFacts?.brandName?.value,
    industry: packet.projectFacts?.industry?.value,
    spatialStatus: packet.mediaTranslations?.spatial?.status,
    sceneProgramCount: Array.isArray(packet.mediaTranslations?.spatial?.sceneProgram)
      ? packet.mediaTranslations!.spatial!.sceneProgram!.length
      : 0,
    abstractionCount: Array.isArray(packet.abstractions) ? packet.abstractions.length : 0,
    executionDataStatus: packet.validation?.executionDataStatus,
    missingExecutionFields: packet.validation?.missingExecutionFields ?? [],
    hardFactStatus: packet.validation?.hardFactStatus,
  });
  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await fs.writeFile(path.resolve(outputPath), packetRaw, 'utf8');
  result({ copied: outputPath });

  if (
    analysis.project.status !== 'completed'
    || packet.validation?.executionDataStatus !== 'ready'
  ) {
    throw new Error(`结构化分析未达 ready：status=${analysis.project.status}, executionDataStatus=${packet.validation?.executionDataStatus}`);
  }
}

app.whenReady().then(async () => {
  try {
    await main();
    app.exit(0);
  } catch (error) {
    const safe = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { message: String(error) };
    process.stderr.write(`PACKET_ERROR ${JSON.stringify(safe)}\n`);
    app.exit(1);
  }
});
