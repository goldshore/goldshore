import fs from 'fs';
import path from 'path';

const ASSET_FOLDERS = [
  './assets/logo/',
  './assets/penrose/',
  './assets/ai/',
  './assets/icons/',
  './public/images/',
];

export function relocateMissingAsset(filename, targetDir = './assets/ai/') {
  // 1. Check if it already exists in targetDir
  const targetPath = path.join(targetDir, filename);
  if (fs.existsSync(targetPath)) {
    console.log(`[✓] Found: ${targetPath}`);
    return targetPath;
  }

  // 2. Search other known folders for the same filename
  for (const dir of ASSET_FOLDERS) {
    const fullPath = path.join(dir, filename);
    if (fs.existsSync(fullPath)) {
      // Copy to targetDir
      fs.copyFileSync(fullPath, targetPath);
      console.log(`[→] Copied ${filename} from ${dir} to ${targetDir}`);
      return targetPath;
    }
  }

  console.warn(`[!] File ${filename} not found in known folders.`);
  return null;
}