/** 把 12 张 1× 全景拼成一张对比图（4 季 × 3 时段），用法：node scripts/stitch-village.mjs */
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';

const seasons = ['spring', 'summer', 'autumn', 'winter'];
const slots = ['dawn', 'day', 'night'];
const imgs = seasons.map((s) => slots.map((t) => PNG.sync.read(readFileSync(`shots/village-1x-${s}-${t}.png`))));
const w = imgs[0][0].width, h = imgs[0][0].height, gap = 8;
const out = new PNG({ width: slots.length * (w + gap) - gap, height: seasons.length * (h + gap) - gap });
out.data.fill(0);
for (let i = 0; i < out.data.length; i += 4) { out.data[i] = 0x3b; out.data[i + 1] = 0x24; out.data[i + 2] = 0x12; out.data[i + 3] = 255; }
imgs.forEach((row, r) => row.forEach((img, c) => {
  const ox = c * (w + gap), oy = r * (h + gap);
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const si = (y * img.width + x) * 4, di = ((oy + y) * out.width + ox + x) * 4;
    out.data[di] = img.data[si]; out.data[di + 1] = img.data[si + 1]; out.data[di + 2] = img.data[si + 2]; out.data[di + 3] = 255;
  }
}));
writeFileSync('shots/village-1x-all.png', PNG.sync.write(out));
console.log('wrote village-1x-all.png', out.width, out.height);
