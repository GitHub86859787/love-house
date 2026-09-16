// 生成 PWA 图标：32×32 像素画（木框 + 羊皮纸 + 像素心）放大到 192 / 512 / 180
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const W = '#5c3a1e', L = '#8b5a2b', P = '#f4e4bc', D = '#e8d5a3', R = '#e6323c', H = '#ff8a8f', O = '#7a1018', K = '#b0202a';
const heart = [
  '................',
  '..OOOO....OOOO..',
  '.ORRRRO..ORRRRO.',
  'ORHRRRROORRRRHRO',
  'ORHRRRRRRRRRRHRO',
  'ORRRRRRRRRRRRRRO',
  'ORRRRRRRRRRRRRRO',
  'ORRRRRRRRRRRRRRO',
  '.ORRRRRRRRRRRRO.',
  '.OKRRRRRRRRRRKO.',
  '..OKRRRRRRRRKO..',
  '...OKRRRRRRKO...',
  '....OKRRRRKO....',
  '.....OKRRKO.....',
  '......OOOO......',
  '................',
];
const map = { O, R, H, K };
const size = 32;
const px = Array.from({ length: size }, () => Array(size).fill(P));
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
  if (edge < 3) px[y][x] = W; else if (edge < 5) px[y][x] = L; else if (edge < 6) px[y][x] = D;
  // 像素圆角
  if ((x < 2 && y < 2) || (x > size - 3 && y < 2) || (x < 2 && y > size - 3) || (x > size - 3 && y > size - 3)) px[y][x] = W;
}
heart.forEach((row, j) => [...row].forEach((ch, i) => { if (map[ch]) px[8 + j][8 + i] = map[ch]; }));

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(scaleTo) {
  const s = scaleTo / size;
  const raw = Buffer.alloc((scaleTo * 3 + 1) * scaleTo);
  for (let y = 0; y < scaleTo; y++) {
    raw[y * (scaleTo * 3 + 1)] = 0;
    for (let x = 0; x < scaleTo; x++) {
      const c = px[Math.floor(y / s)][Math.floor(x / s)];
      const n = parseInt(c.slice(1), 16);
      const o = y * (scaleTo * 3 + 1) + 1 + x * 3;
      raw[o] = (n >> 16) & 255; raw[o + 1] = (n >> 8) & 255; raw[o + 2] = n & 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(scaleTo, 0); ihdr.writeUInt32BE(scaleTo, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192));
writeFileSync('public/icons/icon-512.png', png(512));
writeFileSync('public/icons/apple-touch-icon.png', png(160)); // 160 = 32×5，iOS 会自行缩放
console.log('icons written');
