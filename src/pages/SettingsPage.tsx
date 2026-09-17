import { db } from '@/db/db';
import { DEFAULT_SETTINGS, updateSettings, useSettings } from '@/db/settings';
import { RELATIONS, RELATION_ORDER } from '@/config/relations';
import { SCORING } from '@/config/scoring';
import { HOLIDAYS } from '@/config/holidays';
import { play, setSoundEnabled } from '@/audio/sound';
import { AiSettings } from '@/features/ai/AiSettings';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/pixel/avatar/Avatar';
import { Page, PageHeader } from '@/app/Layout';
import { Panel, Inset } from '@/ui/Panel';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Field';
import { DataPanel } from '@/features/backup/DataPanel';

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <span style={{ flex: 1 }}>
        <div>{label}</div>
        {hint && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>{hint}</div>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="px-corner-sm"
        style={{
          width: 56,
          height: 28,
          border: '2px solid var(--wood-dark)',
          background: checked ? 'var(--grass)' : 'var(--paper-deep)',
          position: 'relative',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 30 : 2,
            width: 20,
            height: 20,
            background: 'var(--white)',
            border: '2px solid var(--wood-light)',
            transition: 'left 80ms steps(2)',
          }}
        />
      </button>
    </label>
  );
}

export function SettingsPage() {
  const nav = useNavigate();
  const settings = useSettings();
  const me = useLiveQuery(() => db.persons.filter((p) => Boolean(p.isMe)).first(), []);

  return (
    <Page>
      <PageHeader title="设置" subtitle={`人情村 v${__APP_VERSION__} · 数据只在本机`} />

      <Panel title="我的档案" tight>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
          {me ? <Avatar config={me.avatar} scale={2} /> : <div style={{ width: 48, height: 48, border: '2px dashed var(--wood-light)' }} />}
          <div style={{ flex: 1, fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>
            {me ? `${me.name} · ${me.birth ? '生辰已填' : '还没填生辰'}` : '和其他村民一样的一份档案：头像、喜好、雷区、笔记、占卜解读。'}
          </div>
          <Button size="small" variant="primary" onClick={() => nav(me ? `/person/${me.id}` : '/person/new?me=1')}>
            {me ? '查看' : '建档案'}
          </Button>
        </div>
      </Panel>

      <AiSettings Toggle={Toggle} />

      <Panel title="计分规则">
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 8 }}>
          每颗心 {SCORING.pointsPerHeart} 点。送礼：最爱 +{SCORING.gift.love} / 喜欢 +{SCORING.gift.like} / 一般 +{SCORING.gift.neutral} / 讨厌 {SCORING.gift.dislike} / 最讨厌{' '}
          {SCORING.gift.hate}；生日送礼 ×{SCORING.birthdayGiftMultiplier}。聊天 +{SCORING.interaction.chat}、见面 +{SCORING.interaction.meet}、帮忙 +
          {SCORING.interaction.help}、一起活动 +{SCORING.interaction.activity}、节日问候 +{SCORING.interaction.festival}。
        </p>
        <Toggle
          label="每周送礼上限 2 次"
          hint="周一重置；生日当天不受限。超出的会记录但不加分"
          checked={settings.weeklyGiftLimitEnabled}
          onChange={(v) => updateSettings({ weeklyGiftLimitEnabled: v })}
        />
      </Panel>

      <Panel title="衰减与提醒">
        <Toggle
          label="好感度衰减"
          hint={`超过宽限天数后每天 -${SCORING.decayPerDay}，只掉到当前整心底部。关闭后仍会提醒联系`}
          checked={settings.decayEnabled}
          onChange={(v) => updateSettings({ decayEnabled: v })}
        />
        <Inset>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 8 }}>各关系类型的久未联系宽限天数</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {RELATION_ORDER.map((r) => (
              <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-sm)' }}>
                <span style={{ width: 56, flex: 'none' }}>{RELATIONS[r].label}</span>
                <Input
                  inputMode="numeric"
                  value={String(settings.graceDays[r])}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/\D/g, '') || 0);
                    updateSettings({ graceDays: { ...settings.graceDays, [r]: n } });
                  }}
                  style={{ minHeight: 32, padding: '4px 8px' }}
                />
                <span>天</span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>家人默认不衰减，但超过宽限天数仍会提醒。</div>
          <Button size="small" variant="ghost" style={{ marginTop: 8 }} onClick={() => updateSettings({ graceDays: DEFAULT_SETTINGS.graceDays })}>
            恢复默认
          </Button>
        </Inset>
      </Panel>

      <Panel title="任务板">
        <Toggle label="本命年提醒" hint="某人进入本命年那年，春节起 30 天内提醒送点红色的东西" checked={settings.benmingnianReminder} onChange={(v) => updateSettings({ benmingnianReminder: v })} />
        <Inset>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 4 }}>节日问候提醒（按适用关系类型出任务）</div>
          {HOLIDAYS.map((h) => {
            const on = !settings.disabledHolidays.includes(h.id);
            const rel = h.relations === 'all' ? '所有人' : h.relations.map((r) => RELATIONS[r].label).join(' / ');
            return (
              <Toggle
                key={h.id}
                label={`${h.name}${h.lunar ? '（农历）' : ''}`}
                hint={`提前 ${h.daysBefore} 天 · ${rel}`}
                checked={on}
                onChange={(v) => updateSettings({ disabledHolidays: v ? settings.disabledHolidays.filter((x) => x !== h.id) : [...settings.disabledHolidays, h.id] })}
              />
            );
          })}
        </Inset>
      </Panel>

      <Panel title="音效">
        <Toggle
          label="8-bit 音效"
          hint="Web Audio 合成，不用外部音频文件"
          checked={settings.soundEnabled}
          onChange={(v) => {
            updateSettings({ soundEnabled: v });
            setSoundEnabled(v);
            if (v) play('heartUp');
          }}
        />
      </Panel>

      <Panel title="年度回顾" tight>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
          <span style={{ flex: 1, fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>这一年认识了谁、记了多少笔、涨了几颗心，做成一张像素总结卡，可以存图。</span>
          <Button size="small" variant="primary" onClick={() => nav('/review')}>
            看回顾
          </Button>
        </div>
      </Panel>

      <DataPanel />

      <Panel title="排盘自检" tight>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
          <span style={{ flex: 1, fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>把一组已知生日跑一遍，计算值和标准值并排显示，不一致标红。随时能看排盘有没有坏。</span>
          <Button size="small" variant="ghost" onClick={() => nav('/selfcheck')}>
            打开
          </Button>
        </div>
      </Panel>

      <Panel title="关于">
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>人情村 v{__APP_VERSION__} · 阶段 6 打磨</p>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>字体：缝合像素字体 Fusion Pixel（OFL 许可）；农历：lunar-typescript（MIT）；天文：astronomy-engine（MIT）</p>
      </Panel>

    </Page>
  );
}
