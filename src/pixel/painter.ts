/**
 * 像素画引擎：一个 w×h 的颜色网格，提供画点 / 画矩形 / 描边 / 镜像 / 叠加等操作，
 * 所有像素素材都用代码画出来，再渲染成 data URL 由 <img> 放大显示。
 */
export type Pixel = string | null;

export class Grid {
  readonly w: number;
  readonly h: number;
  readonly data: Pixel[];

  constructor(w: number, h: number, data?: Pixel[]) {
    this.w = w;
    this.h = h;
    this.data = data ?? new Array<Pixel>(w * h).fill(null);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): Pixel {
    return this.inBounds(x, y) ? this.data[y * this.w + x] : null;
  }

  set(x: number, y: number, c: Pixel): this {
    if (this.inBounds(x, y)) this.data[y * this.w + x] = c;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: Pixel): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
    return this;
  }

  hline(x: number, y: number, len: number, c: Pixel): this {
    return this.rect(x, y, len, 1, c);
  }

  vline(x: number, y: number, len: number, c: Pixel): this {
    return this.rect(x, y, 1, len, c);
  }

  /** 画一个像素椭圆（实心） */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Pixel): this {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) {
      for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
        const dx = (i + 0.5 - cx) / (rx + 0.5);
        const dy = (j + 0.5 - cy) / (ry + 0.5);
        if (dx * dx + dy * dy <= 1) this.set(i, j, c);
      }
    }
    return this;
  }

  /** 把字符画贴上来：map 中每个字符对应一种颜色，'.' 或空格为透明 */
  paste(x: number, y: number, rows: string[], map: Record<string, Pixel>): this {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        const c = map[ch];
        if (c !== undefined) this.set(x + i, y + j, c);
      }
    });
    return this;
  }

  /** 叠加另一张图（跳过透明像素） */
  compose(other: Grid, dx = 0, dy = 0): this {
    for (let j = 0; j < other.h; j++) {
      for (let i = 0; i < other.w; i++) {
        const c = other.get(i, j);
        if (c) this.set(i + dx, j + dy, c);
      }
    }
    return this;
  }

  /** 左右镜像的一半复制到右侧 */
  mirrorLeftToRight(): this {
    const half = Math.floor(this.w / 2);
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < half; i++) {
        this.set(this.w - 1 - i, j, this.get(i, j));
      }
    }
    return this;
  }

  /** 给整张图的轮廓（透明像素中与实心相邻的）描一圈边 */
  outline(c: string): this {
    const src = this.data.slice();
    const at = (x: number, y: number) => (this.inBounds(x, y) ? src[y * this.w + x] : null);
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        if (at(i, j)) continue;
        if (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1)) this.set(i, j, c);
      }
    }
    return this;
  }

  /** 把所有非透明像素替换成同一颜色（用于剪影 / 变灰） */
  fillAll(c: string): this {
    for (let k = 0; k < this.data.length; k++) if (this.data[k]) this.data[k] = c;
    return this;
  }

  clone(): Grid {
    return new Grid(this.w, this.h, this.data.slice());
  }

  /** 用于缓存的稳定 key */
  key(): string {
    return `${this.w}x${this.h}:${this.data.map((c) => c ?? '_').join(',')}`;
  }
}
