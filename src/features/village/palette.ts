/**
 * 人情村场景调色板：16 个色系 × 3 阶 = 48 色，场景里所有素材只能从这里取色。
 * 规则：暗阶色相向紫蓝偏、亮阶向黄偏；描边用逐色系指定的描边色（从其他色系的暗阶借，不新增颜色）；
 * 没有 #000 / #FFF，不用渐变、抗锯齿、半透明。
 */
export type Shade = 'dark' | 'base' | 'light';

export interface Family {
  key: FamilyKey;
  label: string;
  dark: string;
  base: string;
  light: string;
  /** 描边色：另一个色系的暗阶（或墨系） */
  outline: string;
  usage: string;
}

export type FamilyKey = 'ink' | 'wood' | 'earth' | 'stone' | 'brick' | 'plaster' | 'tile' | 'grass' | 'autumn' | 'snow' | 'water' | 'mist' | 'night' | 'gold' | 'pink' | 'purple';

// 先定各阶颜色，描边色在下面按色系引用
const C = {
  ink: { dark: '#26191f', base: '#3b2a24', light: '#5b4536' },
  wood: { dark: '#5e3a2e', base: '#8b5a2b', light: '#b8843f' },
  earth: { dark: '#9a7048', base: '#c4965e', light: '#e1bd85' },
  stone: { dark: '#5f6076', base: '#8a8ea0', light: '#b8bcc8' },
  brick: { dark: '#7a2f3a', base: '#a8453b', light: '#d0745a' },
  plaster: { dark: '#b9a99c', base: '#e6d9c6', light: '#f6eddc' },
  tile: { dark: '#2f4a52', base: '#4a6f78', light: '#7a9ea4' },
  grass: { dark: '#3f7f3c', base: '#63a83e', light: '#94cc52' },
  autumn: { dark: '#94682a', base: '#c99a3e', light: '#e6c46a' },
  snow: { dark: '#a8b8d0', base: '#d6e2ee', light: '#f1f5f8' },
  water: { dark: '#2c5d94', base: '#3f8fcf', light: '#7ec8ee' },
  mist: { dark: '#66739f', base: '#8f9dbf', light: '#c0c3dc' },
  night: { dark: '#1a1f3f', base: '#2c3465', light: '#4b5590' },
  gold: { dark: '#b0791c', base: '#f0b83e', light: '#ffe08c' },
  pink: { dark: '#b04a6e', base: '#e07a95', light: '#f7b6c6' },
  purple: { dark: '#472a6e', base: '#6f4a99', light: '#9d7cc4' },
} satisfies Record<FamilyKey, Record<Shade, string>>;

export const FAMILIES: Family[] = [
  { key: 'ink', label: '墨', ...C.ink, outline: C.ink.dark, usage: '最深描边、门缝、瞳孔、屋檩' },
  { key: 'wood', label: '木', ...C.wood, outline: C.ink.base, usage: '木墙、栏杆、桥、树干、门' },
  { key: 'earth', label: '土路', ...C.earth, outline: C.wood.dark, usage: '小路、田垄、屋前地、水底' },
  { key: 'stone', label: '石', ...C.stone, outline: C.ink.base, usage: '石板、井、石阶、屋基' },
  { key: 'brick', label: '砖红', ...C.brick, outline: C.ink.base, usage: '工坊砖墙、广场屋顶、灯笼、苹果' },
  { key: 'plaster', label: '白灰墙', ...C.plaster, outline: C.wood.dark, usage: '老宅、旅店白墙、鸭身、云' },
  { key: 'tile', label: '青瓦', ...C.tile, outline: C.ink.base, usage: '老宅青瓦、工坊瓦、夏季树冠暗部、植物描边' },
  { key: 'grass', label: '春草', ...C.grass, outline: C.tile.dark, usage: '春夏草地、树冠、灌木、田里青苗' },
  { key: 'autumn', label: '秋草', ...C.autumn, outline: C.wood.dark, usage: '秋草地、麦穗、稻草、芦苇' },
  { key: 'snow', label: '雪', ...C.snow, outline: C.stone.dark, usage: '冬季地面、屋顶积雪、冰面、雪人' },
  { key: 'water', label: '水', ...C.water, outline: C.water.dark, usage: '溪、湖、波纹' },
  { key: 'mist', label: '远山 / 雾', ...C.mist, outline: C.night.dark, usage: '顶部远山、天空边缘、昼夜过渡中间色、晨雾' },
  { key: 'night', label: '夜天', ...C.night, outline: C.night.dark, usage: '夜晚换色基底、影子、灰化剪影、星星用雪亮阶' },
  { key: 'gold', label: '金', ...C.gold, outline: C.wood.dark, usage: '灯光、光晕、水晶球、麦穗头、满心金星' },
  { key: 'pink', label: '粉', ...C.pink, outline: C.brick.dark, usage: '春樱、湖边小屋屋顶、心形气泡' },
  { key: 'purple', label: '紫', ...C.purple, outline: C.night.dark, usage: '帐篷、水晶球座、茶馆幌子' },
];

export const PALETTE: Record<FamilyKey, Family> = Object.fromEntries(FAMILIES.map((f) => [f.key, f])) as Record<FamilyKey, Family>;

/** 全部 48 色（去重后应恰好 48 个） */
export const ALL_COLORS: string[] = FAMILIES.flatMap((f) => [f.dark, f.base, f.light]);
export const COLOR_SET = new Set(ALL_COLORS);

/** 三阶色带：素材里用 L / B / D 三个字母引用 */
export interface Ramp {
  light: string;
  base: string;
  dark: string;
  outline: string;
}
export function ramp(key: FamilyKey): Ramp {
  const f = PALETTE[key];
  return { light: f.light, base: f.base, dark: f.dark, outline: f.outline };
}

/* ------------------------------ 四季 ------------------------------ */
import type { Season } from '@/lib/season';

/** 每季地面 / 植被用哪条色带：夏天把春草整体压暗一阶（暗阶借青瓦暗），秋用秋草，冬用雪 */
export interface SeasonRamps {
  grass: Ramp;
  /** 树冠 / 灌木 */
  leaf: Ramp;
  /** 田里的作物 */
  crop: Ramp;
}
export const SEASON_RAMPS: Record<Season, SeasonRamps> = {
  spring: {
    grass: ramp('grass'),
    leaf: { light: C.pink.light, base: C.pink.base, dark: C.pink.dark, outline: C.brick.dark },
    crop: { light: C.grass.light, base: C.grass.base, dark: C.grass.dark, outline: C.tile.dark },
  },
  summer: {
    grass: { light: C.grass.base, base: C.grass.dark, dark: C.tile.dark, outline: C.tile.dark },
    leaf: { light: C.grass.base, base: C.grass.dark, dark: C.tile.dark, outline: C.tile.dark },
    crop: { light: C.grass.light, base: C.grass.base, dark: C.grass.dark, outline: C.tile.dark },
  },
  autumn: {
    grass: ramp('autumn'),
    leaf: { light: C.gold.base, base: C.brick.light, dark: C.brick.base, outline: C.brick.dark },
    crop: { light: C.gold.light, base: C.gold.base, dark: C.autumn.dark, outline: C.wood.dark },
  },
  winter: {
    grass: ramp('snow'),
    leaf: { light: C.snow.light, base: C.snow.base, dark: C.wood.base, outline: C.wood.dark },
    crop: { light: C.snow.light, base: C.snow.base, dark: C.snow.dark, outline: C.stone.dark },
  },
};
