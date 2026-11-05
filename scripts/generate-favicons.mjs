import fs from 'node:fs/promises';
import sharp from 'sharp';

// Preserve the existing logo proportions; add white padding instead of cropping.
await fs.mkdir('public/img/seo', { recursive: true });
for (const [file, size] of [['favicon.png', 192], ['apple-touch-icon.png', 180]]) {
  await sharp('public/img/logo.png')
    .resize(size, size, { fit: 'contain', background: '#ffffff' })
    .png()
    .toFile(`public/img/seo/${file}`);
}
console.log('Iconos generados desde el logo original: 192 × 192 y 180 × 180.');
