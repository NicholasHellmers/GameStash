const fs = require('fs');
const path = require('path');
const os = require('os');

function getGameStashDataDirs() {
  const homeDir = os.homedir();
  const dirs = [];

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
    dirs.push(path.join(localAppData, 'GameStash'));
    dirs.push(path.join(localAppData, 'com.gamestash.desktop'));
    dirs.push(path.join(localAppData, 'gamestash-desktop'));
    dirs.push(path.join(localAppData, 'gamestash'));
  } else {
    // Linux / macOS standard paths
    const xdgDataHome = process.env.XDG_DATA_HOME || path.join(homeDir, '.local', 'share');
    const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config');
    dirs.push(path.join(xdgDataHome, 'GameStash'));
    dirs.push(path.join(xdgDataHome, 'com.gamestash.desktop'));
    dirs.push(path.join(xdgConfigHome, 'GameStash'));
    dirs.push(path.join(xdgConfigHome, 'com.gamestash.desktop'));
    dirs.push(path.join(homeDir, 'Games', 'GameStash'));
  }

  return dirs;
}

console.log('🧹 [GameStash Deep-Clean] Resetting local data folders and caches...');

const targets = getGameStashDataDirs();

for (const targetDir of targets) {
  if (fs.existsSync(targetDir)) {
    try {
      fs.rmSync(targetDir, { recursive: true, force: true });
      console.log(`  ✓ Removed local GameStash data directory: ${targetDir}`);
    } catch (err) {
      console.warn(`  ⚠ Could not remove ${targetDir}: ${err.message}`);
    }
  } else {
    console.log(`  - No existing data directory found at: ${targetDir}`);
  }
}

// Clean local frontend build artifacts and cache
const distPath = path.join(__dirname, '..', 'apps', 'desktop', 'dist');
if (fs.existsSync(distPath)) {
  try {
    fs.rmSync(distPath, { recursive: true, force: true });
    console.log(`  ✓ Removed desktop build artifacts: ${distPath}`);
  } catch (err) {
    console.warn(`  ⚠ Could not remove ${distPath}: ${err.message}`);
  }
}

console.log('✨ [GameStash Deep-Clean] Local folders and scraping cache have been completely reset.\n');
