import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const srcDir = 'apps/web/public/images/raw';
const outDir = 'apps/web/public/images/optimized';

fs.mkdirSync(outDir, { recursive: true });

for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
  if (!entry.isFile()) continue;

  const inputPath = path.join(srcDir, entry.name);
  if (!/\.(png|jpe?g)$/i.test(inputPath)) continue;

  const base = path.parse(entry.name).name;
  const pipeline = sharp(inputPath)
    .modulate({ brightness: 0.95, saturation: 0.9 })
    .composite([
      {
        input: Buffer.from([255, 255, 255, 230]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'overlay'
      }
    ]);

  await Promise.all([
    pipeline.clone().webp({ quality: 82 }).toFile(path.join(outDir, `${base}.webp`)),
    pipeline.clone().avif({ quality: 60 }).toFile(path.join(outDir, `${base}.avif`))
  ]);
}

console.log('Images processed →', outDir);
