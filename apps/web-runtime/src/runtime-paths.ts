import os from 'node:os';
import path from 'node:path';

export interface NodeRuntimePaths {
  repoRoot: string;
  userData: string;
  settingsFile: string;
  credentials: string;
  defaultDataPath: string;
  promptRoot: string;
}

function platformUserDataRoot(environment: NodeJS.ProcessEnv): string {
  if (process.platform === 'win32') {
    return environment.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  }
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support');
  return environment.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
}

export function createNodeRuntimePaths(
  environment: NodeJS.ProcessEnv = process.env,
  currentDirectory: string = process.cwd(),
): NodeRuntimePaths {
  const repoRoot = path.resolve(environment.MASTERPIECE_REPO_ROOT || currentDirectory);
  const userData = path.resolve(
    environment.MASTERPIECE_USER_DATA_DIR
      || path.join(platformUserDataRoot(environment), 'masterpiece-os-desktop'),
  );
  return Object.freeze({
    repoRoot,
    userData,
    settingsFile: path.join(userData, 'settings.json'),
    credentials: path.join(userData, 'node-credentials'),
    defaultDataPath: path.join(userData, 'Masterpiece OS Data'),
    promptRoot: path.resolve(environment.MASTERPIECE_PROMPT_ROOT || path.join(repoRoot, 'apps', 'cli', 'prompts', 'v5')),
  });
}
