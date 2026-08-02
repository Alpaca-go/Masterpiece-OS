import { app } from 'electron';
import path from 'node:path';
import { createImageGenerationService } from '../src/main/image-generation/service.ts';
import { createShortChainImageGenerationService } from '../src/main/image-generation/short-chain-service.ts';
import { createProjectContextService } from '../src/main/project-context-service.ts';
import { createProjectStore } from '../src/main/project-store.ts';
import { getProviderCredentials, getSettings } from '../src/main/settings-store.ts';

const projectId = process.env.MASTERPIECE_SMOKE_PROJECT_ID?.trim() || '';
const runId = process.env.MASTERPIECE_SMOKE_RUN_ID?.trim() || '';
const imageId = process.env.MASTERPIECE_SMOKE_IMAGE_ID?.trim() || '';
const logoAssetId = process.env.MASTERPIECE_SMOKE_LOGO_ASSET_ID?.trim() || '';
const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');

function numbers(name: string, expected: number): number[] {
  const values = (process.env[name] || '').split(',').map(Number);
  if (values.length !== expected || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`${name} 必须包含 ${expected} 个逗号分隔数字`);
  }
  return values;
}

app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

async function main(): Promise<void> {
  if (!projectId || !runId || !imageId || !logoAssetId) {
    throw new Error(
      '缺少 MASTERPIECE_SMOKE_PROJECT_ID / MASTERPIECE_SMOKE_RUN_ID / '
      + 'MASTERPIECE_SMOKE_IMAGE_ID / MASTERPIECE_SMOKE_LOGO_ASSET_ID',
    );
  }
  const crop = numbers('MASTERPIECE_SMOKE_LOGO_CROP', 4);
  const placement = numbers('MASTERPIECE_SMOKE_LOGO_PLACEMENT', 3);
  const settings = await getSettings();
  const projects = createProjectStore(getSettings);
  const imageGeneration = createImageGenerationService({
    readSettings: getSettings,
    readCredentials: getProviderCredentials,
    loadContext: async () => {
      throw new Error('Logo post-composite does not load generation context');
    },
    dataPath: path.resolve(settings.defaultDataPath),
  });
  const short-chain = createShortChainImageGenerationService(
    projects,
    createProjectContextService({ projects }),
    () => imageGeneration,
  );
  const result = await short-chain.postCompositeLogo({
    projectId,
    runId,
    imageId,
    logoAssetId,
    confirmedByUser: true,
    sourceCrop: {
      left: crop[0]!,
      top: crop[1]!,
      width: crop[2]!,
      height: crop[3]!,
    },
    placement: {
      x: placement[0]!,
      y: placement[1]!,
      width: placement[2]!,
    },
    removeBackground: { enabled: true, tolerance: 28 },
  });
  process.stdout.write(`LOGO_POST_COMPOSITE_RESULT ${JSON.stringify(result)}\n`);
}

app.whenReady().then(async () => {
  try {
    await main();
    app.exit(0);
  } catch (error) {
    const safe = error instanceof Error
      ? { name: error.name, message: error.message }
      : { message: String(error) };
    process.stderr.write(`LOGO_POST_COMPOSITE_ERROR ${JSON.stringify(safe)}\n`);
    app.exit(1);
  }
});
