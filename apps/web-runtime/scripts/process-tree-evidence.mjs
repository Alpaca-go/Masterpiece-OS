import { execFileSync } from 'node:child_process';

function readWindowsProcesses() {
  const script = [
    '$items = Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine',
    '$items | ConvertTo-Json -Compress',
  ].join('; ');
  const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
    encoding: 'utf8',
    windowsHide: true,
  }).trim();
  if (!output) return [];
  const value = JSON.parse(output);
  return Array.isArray(value) ? value : [value];
}

export function collectProcessTreeEvidence(rootPid = process.pid) {
  if (process.platform !== 'win32') {
    return {
      rootPid,
      inspectedProcessCount: 1,
      electronProcessCount: 0,
      desktopMainProcessCount: 0,
      forbiddenProcesses: [],
      inspection: 'spawn-contract',
    };
  }

  const processes = readWindowsProcesses();
  const descendants = [];
  const pendingParents = new Set([rootPid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of processes) {
      if (pendingParents.has(item.ParentProcessId) && !pendingParents.has(item.ProcessId)) {
        pendingParents.add(item.ProcessId);
        descendants.push(item);
        changed = true;
      }
    }
  }
  const evidence = descendants.map((item) => ({
    pid: item.ProcessId,
    parentPid: item.ParentProcessId,
    name: String(item.Name || ''),
    commandLine: String(item.CommandLine || ''),
  }));
  const electron = evidence.filter((item) => /(^|[\\/])electron(?:\.exe)?\b|electron-vite/i.test(`${item.name} ${item.commandLine}`));
  const desktopMain = evidence.filter((item) => /apps[\\/]desktop[\\/](?:src[\\/]main|dist[\\/]main)|electron\.vite\.config/i.test(item.commandLine));
  return {
    rootPid,
    inspectedProcessCount: evidence.length,
    electronProcessCount: electron.length,
    desktopMainProcessCount: desktopMain.length,
    forbiddenProcesses: [...electron, ...desktopMain].filter((item, index, all) => (
      all.findIndex((candidate) => candidate.pid === item.pid) === index
    )),
    inspection: 'windows-descendant-tree',
  };
}

export function assertNodeOnlyProcessTree(rootPid = process.pid) {
  const evidence = collectProcessTreeEvidence(rootPid);
  if (evidence.electronProcessCount !== 0 || evidence.desktopMainProcessCount !== 0) {
    throw new Error(`WEB_PROCESS_BOUNDARY_VIOLATION: ${JSON.stringify(evidence.forbiddenProcesses)}`);
  }
  return evidence;
}
