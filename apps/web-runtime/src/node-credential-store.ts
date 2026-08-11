import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const KEY_BYTES = 32;
const IV_BYTES = 12;

function profileEnvironmentName(profileId: string): string {
  return `MASTERPIECE_API_KEY_${profileId.replace(/[^a-zA-Z0-9]/gu, '_').toUpperCase()}`;
}

function assertProfileId(profileId: string): void {
  if (!/^[a-zA-Z0-9-]+$/u.test(profileId)) throw new Error('API Profile ID 无效');
}

export function createNodeCredentialStore(root: string, environment: NodeJS.ProcessEnv = process.env) {
  const masterKeyPath = path.join(root, 'master.key');
  const credentialPath = (profileId: string) => {
    assertProfileId(profileId);
    return path.join(root, `${profileId}.bin`);
  };

  async function masterKey(create: boolean): Promise<Buffer | null> {
    const existing = await fs.readFile(masterKeyPath).catch(() => null);
    if (existing) {
      if (existing.length !== KEY_BYTES) throw new Error('NODE_CREDENTIAL_MASTER_KEY_INVALID');
      return existing;
    }
    if (!create) return null;
    const key = crypto.randomBytes(KEY_BYTES);
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(masterKeyPath, key, { mode: 0o600, flag: 'wx' }).catch(async (error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') throw error;
    });
    return fs.readFile(masterKeyPath);
  }

  function environmentValue(profileId: string): string {
    return String(environment[profileEnvironmentName(profileId)] || environment.MASTERPIECE_API_KEY || '').trim();
  }

  return Object.freeze({
    async has(profileId: string): Promise<boolean> {
      if (environmentValue(profileId)) return true;
      return fs.stat(credentialPath(profileId)).then((value) => value.isFile()).catch(() => false);
    },
    async read(profileId: string): Promise<string> {
      const fromEnvironment = environmentValue(profileId);
      if (fromEnvironment) return fromEnvironment;
      const encrypted = await fs.readFile(credentialPath(profileId)).catch(() => null);
      if (!encrypted) return '';
      const key = await masterKey(false);
      if (!key || encrypted.length <= IV_BYTES + 16) throw new Error('NODE_CREDENTIAL_PAYLOAD_INVALID');
      const iv = encrypted.subarray(0, IV_BYTES);
      const tag = encrypted.subarray(IV_BYTES, IV_BYTES + 16);
      const payload = encrypted.subarray(IV_BYTES + 16);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8');
    },
    async write(profileId: string, apiKey: string): Promise<void> {
      const key = await masterKey(true);
      if (!key) throw new Error('NODE_CREDENTIAL_MASTER_KEY_MISSING');
      const iv = crypto.randomBytes(IV_BYTES);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const payload = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
      await fs.mkdir(root, { recursive: true });
      await fs.writeFile(credentialPath(profileId), Buffer.concat([iv, cipher.getAuthTag(), payload]), { mode: 0o600 });
    },
    async remove(profileId: string): Promise<void> {
      await fs.rm(credentialPath(profileId), { force: true });
    },
  });
}
