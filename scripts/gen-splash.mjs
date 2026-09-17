// 生成 iOS 启动画面：羊皮纸底 + 居中像素图标 + 底部深木色条，各机型一张
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const W = '#5c3a1e', L = '#8b5a2b', P = '#f4e4bc', D = '#e8d5a3', R = '#e6323c', H = '#ff8a8f', O = '#7a1018', K = '#b0202a';
const heart = [
  '................', '..OOOO....OOOO..', '.ORRRRO..ORRRRO.', 'ORHRRRROORRRRHRO', 'ORHRRRRRRRRRRHRO', 'ORRRRRRRRRRRRRRO',
  'ORRRRRRRRRRRRRRO', 'ORRRRRRRRRRRRRRO', '.ORRRRRRRRRRRRO.', '.OKRRRRRRRRRRKO.', '..OKRRRRRRRRKO..', '...OKRRRRRRKO...',
  '....OKRRRRKO....', '.....OKRRKO.....', '......OOOO......', '................',
];
const map = { O, R, H, K };
const size = 32;
const icon = Array.from({ length: size }, () => Array(size).fill(P));
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
  if (edge < 3) icon[y][x] = W; else if (edge < 5) icon[y][x] = L; else if (edge < 6) icon[y][x] = D;
  if ((x < 2 && y < 2) || (x > size - 3 && y < 2) || (x < 2 && y > size - 3) || (x > size - 3 && y > size - 3)) icon[y][x] = W;
}
heart.forEach((row, j) => [...row].forEach((ch, i) => { if (map[ch]) icon[8 + j][8 + i] = map[ch]; }));

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const rgb = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

function splash(w, h, ratio) {
  const row = w * 3 + 1;
  const raw = Buffer.alloc(row * h);
  const [pr, pg, pb] = rgb(P);
  const [wr, wg, wb] = rgb(W);
  const scale = 6 * ratio; // 图标 192pt
  const iw = size * scale;
  const ix = Math.floor((w - iw) / 2), iy = Math.floor((h - iw) / 2) - 20 * ratio;
  const band = 4 * ratio; // 底部深木色细条，和导航栏同色
  for (let y = 0; y < h; y++) {
    raw[y * row] = 0;
    for (let x = 0; x < w; x++) {
      let c;
      if (y >= h - band) c = [wr, wg, wb];
      else if (x >= ix && x < ix + iw && y >= iy && y < iy + iw) c = rgb(icon[Math.floor((y - iy) / scale)][Math.floor((x - ix) / scale)]);
      else c = [pr, pg, pb];
      const o = y * row + 1 + x * 3;
      raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// [逻辑宽, 逻辑高, 像素比]
const DEVICES = [
  [440, 956, 3], // 16 Pro Max
  [402, 874, 3], // 16 Pro
  [430, 932, 3], // 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus
  [393, 852, 3], // 14 Pro / 15 / 15 Pro / 16
  [390, 844, 3], // 12 / 13 / 14
  [375, 812, 3], // X / XS / 11 Pro / 12 mini / 13 mini
  [414, 896, 3], // XS Max / 11 Pro Max
  [414, 896, 2], // XR / 11
  [375, 667, 2], // 8 / SE2 / SE3
  [414, 736, 3], // 8 Plus
];
mkdirSync('public/splash', { recursive: true });
const links = [];
for (const [lw, lh, r] of DEVICES) {
  const name = `splash-${lw}x${lh}@${r}x.png`;
  writeFileSync(`public/splash/${name}`, splash(lw * r, lh * r, r));
  links.push(`    <link rel="apple-touch-startup-image" media="screen and (device-width: ${lw}px) and (device-height: ${lh}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)" href="./splash/${name}" />`);
}
console.log(links.join('\n'));
