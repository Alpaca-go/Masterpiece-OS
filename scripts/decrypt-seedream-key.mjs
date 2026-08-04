// Decrypt Seedream API Key using Electron safeStorage
// Usage: electron scripts/decrypt-seedream-key.mjs

import { app, safeStorage } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

const PROFILE_ID = 'profile-0d48c72e-1288-436f-a450-c84c5b8298ca';

async function main() {
  // 等待 app ready
  await app.whenReady();
  
  const credentialsDir = path.join(app.getPath('userData'), 'credentials');
  const credentialPath = path.join(credentialsDir, `${PROFILE_ID}.bin`);
  
  try {
    const encrypted = await fs.readFile(credentialPath);
    const decrypted = await safeStorage.decryptStringAsync(encrypted);
    console.log(decrypted.result);
  } catch (error) {
    console.error('Failed to decrypt API key:', error.message);
    process.exit(1);
  } finally {
    app.quit();
  }
}

main();
