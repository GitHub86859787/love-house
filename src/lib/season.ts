export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** 按真实日期取季节（北半球） */
export function currentSeason(d = new Date()): Season {
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

export const SEASON_PALETTE: Record<Season, { grass: string; grassDark: string; leaf: string; sky: string; path: string }> = {
  spring: { grass: '#7cc24a', grassDark: '#5a9c34', leaf: '#f4a7c3', sky: '#8fd0f5', path: '#c9a86a' },
  summer: { grass: '#6daa2c', grassDark: '#4f8a1e', leaf: '#3f8f2a', sky: '#6fb7e8', path: '#c98b45' },
  autumn: { grass: '#c9a24a', grassDark: '#a07a2c', leaf: '#e0883a', sky: '#9cc4e4', path: '#b07a3c' },
  winter: { grass: '#e8f0f4', grassDark: '#c3d3dc', leaf: '#d7e6ee', sky: '#b6d4e8', path: '#b7a99a' },
};
