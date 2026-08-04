// Test safeStorage availability
import electron from 'electron';
const { app, safeStorage } = electron;
import path from 'node:path';

const desktopUserData = process.env.MASTERPIECE_SMOKE_USER_DATA?.trim()
  || path.join(process.env.APPDATA || '', 'masterpiece-os-desktop');
app.setPath('userData', path.resolve(desktopUserData));
app.setAppPath(path.resolve(process.cwd()));

async function main() {
  try {
    const available = await safeStorage.isAsyncEncryptionAvailable();
    console.log('safeStorage available:', available);
    
    if (!available) {
      console.log('Safe storage is not available. This could be because:');
      console.log('  1. Windows DPAPI is not available');
      console.log('  2. The app is running in an unsupported environment');
      console.log('  3. System security services are not properly configured');
    }
  } catch (error) {
    console.error('Error checking safeStorage:', error.message);
  }
}

main();
