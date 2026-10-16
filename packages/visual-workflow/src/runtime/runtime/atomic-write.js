import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
const DEFAULTS = {
  maxAttempts: 5,
  baseDelayMs: 50,
  maxDelayMs: 800,
  retryableCodes: ["EPERM", "EBUSY", "EACCES"],
  keepTempOnFailure: true
};
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function atomicWriteJsonWithRetry(targetPath, data, options = {}) {
  const settings = { ...DEFAULTS, ...options };
  const resolved = path.resolve(targetPath);
  const tempPath = `${resolved}.${crypto.randomUUID()}.tmp`;
  const rename = settings.rename || fs.rename;
  const wait = settings.wait || sleep;
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  const handle = await fs.open(tempPath, "w");
  try {
    await handle.writeFile(`${JSON.stringify(data, null, 2)}
`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  let lastError;
  let attempts = 0;
  for (let attempt = 1; attempt <= settings.maxAttempts; attempt += 1) {
    attempts = attempt;
    const started = performance.now();
    try {
      await rename(tempPath, resolved);
      settings.onAttempt?.({ targetPath: resolved, tempPath, attempt, delayMs: 0, renameDurationMs: Math.round(performance.now() - started) });
      return { success: true, targetPath: resolved, attempts: attempt };
    } catch (error) {
      lastError = error;
      const retryable = settings.retryableCodes.includes(lastError.code || "");
      const delayMs = Math.min(settings.maxDelayMs, settings.baseDelayMs * 2 ** (attempt - 1));
      settings.onAttempt?.({ targetPath: resolved, tempPath, attempt, delayMs: retryable && attempt < settings.maxAttempts ? delayMs : 0, errorCode: lastError.code, renameDurationMs: Math.round(performance.now() - started) });
      if (!retryable || attempt >= settings.maxAttempts) break;
      await wait(delayMs);
    }
  }
  if (!settings.keepTempOnFailure) await fs.unlink(tempPath).catch(() => void 0);
  return {
    success: false,
    targetPath: resolved,
    tempPath: settings.keepTempOnFailure ? tempPath : void 0,
    attempts,
    errorCode: lastError?.code,
    errorMessage: lastError?.message || "Atomic JSON write failed"
  };
}
export {
  atomicWriteJsonWithRetry
};
