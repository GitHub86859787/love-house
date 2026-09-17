import type { Chart, WuXing } from '@/fortune/chart';
import styles from './ChartCards.module.css';

export const WUXING_COLORS: Record<WuXing, string> = { 木: '#6daa2c', 火: '#e6323c', 土: '#c98b45', 金: '#f5c542', 水: '#6fb7e8' };
const WUXING_ORDER: WuXing[] = ['木', '火', '土', '金', '水'];

const ZODIAC_GLYPH: Record<string, string> = {
  白羊座: '♈', 金牛座: '♉', 双子座: '♊', 巨蟹座: '♋', 狮子座: '♌', 处女座: '♍', 天秤座: '♎', 天蝎座: '♏', 射手座: '♐', 摩羯座: '♑', 水瓶座: '♒', 双鱼座: '♓',
};

/** 顶部一行摘要：星座、生肖、灵数、五行小条 */
export function ChartSummaryRow({ chart }: { chart: Chart }) {
  return (
    <div className={styles.summaryRow}>
      {chart.zodiac && (
        <span>
          {ZODIAC_GLYPH[chart.zodiac.name]} {chart.zodiac.name}
        </span>
      )}
      {chart.shengXiao && <span>属{chart.shengXiao}{chart.benMingNian ? '（本命年）' : ''}</span>}
      {chart.numerology && <span>灵数 {chart.numerology.master}</span>}
      {chart.bazi && (
        <span className={styles.wuxMini} title="五行分布">
          {WUXING_ORDER.map((k) => (
            <span key={k} style={{ height: 6 + chart.bazi!.wuxing[k] * 4, background: WUXING_COLORS[k] }} />
          ))}
        </span>
      )}
    </div>
  );
}

/** 第二层：星座卡 / 灵数卡 / 八字卡 */
export function ChartCards({ chart, systems }: { chart: Chart; systems?: { zodiac?: string | null; numerology?: string | null; bazi?: string | null } }) {
  const b = chart.bazi;
  const maxW = b ? Math.max(1, ...Object.values(b.wuxing)) : 1;
  return (
    <div className={styles.cards}>
      {chart.zodiac && (
        <div className={`${styles.card} px-corner-sm`}>
          <div className={styles.cardTitle}>
            {ZODIAC_GLYPH[chart.zodiac.name]} 星座卡
          </div>
          <div className={styles.row}>
            <span>{chart.zodiac.name}</span>
            <span>{chart.zodiac.element}象</span>
            <span>守护星 {chart.zodiac.planet}</span>
            <span>{chart.zodiac.range}</span>
          </div>
          {systems?.zodiac && <p className={styles.text}>{systems.zodiac}</p>}
        </div>
      )}
      {chart.numerology && (
        <div className={`${styles.card} px-corner-sm`}>
          <div className={styles.cardTitle}>№ 灵数卡</div>
          <div className={styles.row} style={{ color: 'var(--ink-soft)' }}>
            {chart.numerology.steps}
          </div>
          <div className={styles.row}>
            <span style={{ fontSize: 'var(--fs-xl)', lineHeight: '32px' }}>{chart.numerology.master}</span>
            {chart.numerology.master !== chart.numerology.reduced && <span>主数 · 化简 {chart.numerology.reduced}</span>}
          </div>
          {systems?.numerology && <p className={styles.text}>{systems.numerology}</p>}
        </div>
      )}
      {b && (
        <div className={`${styles.card} px-corner-sm`}>
          <div className={styles.cardTitle}>☰ 八字卡</div>
          <div className={styles.pillars}>
            <div className="head" />
            <div className="head">年柱</div>
            <div className="head">月柱</div>
            <div className="head">日柱</div>
            <div className="head">时柱</div>
            <div className="head">天干</div>
            <div className="gan" style={{ color: WUXING_COLORS[b.year.ganWuXing] }}>{b.year.gan}</div>
            <div className="gan" style={{ color: WUXING_COLORS[b.month.ganWuXing] }}>{b.month.gan}</div>
            <div className="gan" style={{ color: WUXING_COLORS[b.day.ganWuXing] }}>{b.day.gan}</div>
            <div className="gan" style={{ color: b.hour ? WUXING_COLORS[b.hour.ganWuXing] : 'var(--ink-soft)' }}>{b.hour?.gan ?? '？'}</div>
            <div className="head">地支</div>
            <div className="gan" style={{ color: WUXING_COLORS[b.year.zhiWuXing] }}>{b.year.zhi}</div>
            <div className="gan" style={{ color: WUXING_COLORS[b.month.zhiWuXing] }}>{b.month.zhi}</div>
            <div className="gan" style={{ color: WUXING_COLORS[b.day.zhiWuXing] }}>{b.day.zhi}</div>
            <div className="gan" style={{ color: b.hour ? WUXING_COLORS[b.hour.zhiWuXing] : 'var(--ink-soft)' }}>{b.hour?.zhi ?? '？'}</div>
          </div>
          <div className={styles.wux}>
            {WUXING_ORDER.map((k) => (
              <div key={k} className={styles.wuxCol}>
                <span>{b.wuxing[k]}</span>
                <div className={styles.wuxBar} style={{ height: 4 + (b.wuxing[k] / maxW) * 40, background: WUXING_COLORS[k] }} />
                <span>{k}</span>
              </div>
            ))}
          </div>
          <div className={styles.row} style={{ color: 'var(--ink-soft)' }}>
            <span>日主 {b.dayMaster}（{b.dayMasterWuXing}）</span>
            <span>纳音 {b.naYin}</span>
            <span>农历 {b.lunarText}</span>
            {chart.shiChen && <span>{chart.shiChen}</span>}
            {b.missing.length > 0 && <span>缺 {b.missing.join('')}</span>}
            <span>最旺 {b.strongest.join('')}</span>
            {chart.shengXiao && <span>属{chart.shengXiao}{chart.benMingNian ? ' · 今年本命年' : ''}</span>}
          </div>
          {!b.hour && <div style={{ fontSize: 10, color: 'var(--ink-soft)' }}>时辰未知，时柱空着。补上时辰能看完整四柱。</div>}
          {systems?.bazi && <p className={styles.text}>{systems.bazi}</p>}
        </div>
      )}
    </div>
  );
}
