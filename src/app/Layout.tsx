import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import styles from './App.module.css';
import { Sprite } from '@/pixel/Sprite';
import { icon, type IconName } from '@/pixel/sprites/icons';
import { runDecayIfNeeded } from '@/features/scoring/runtime';
import { getSettings, updateSettings, useSettings } from '@/db/settings';
import { toDateKey } from '@/lib/date';
import { setSoundEnabled } from '@/audio/sound';
import { ToastLine } from '@/ui/Toast';

const NAV_LEFT: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: '村口', icon: 'village' },
  { to: '/collection', label: '图鉴', icon: 'book' },
];
const NAV_RIGHT: { to: string; label: string; icon: IconName }[] = [{ to: '/settings', label: '设置', icon: 'gear' }];

function NavItem({ to, label, icon: name }: { to: string; label: string; icon: IconName }) {
  return (
    <NavLink to={to} end={to === '/'} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}>
      {({ isActive }) => (
        <>
          <Sprite grid={icon(name, isActive ? '#f5c542' : '#e8d5a3')} scale={2} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export function Layout() {
  const nav = useNavigate();
  const loc = useLocation();
  const settings = useSettings();
  useEffect(() => setSoundEnabled(settings.soundEnabled), [settings.soundEnabled]);

  // 首次使用日期（备份提醒 / 年度回顾用）
  useEffect(() => {
    getSettings()
      .then((s) => (s.firstUseDate ? undefined : updateSettings({ firstUseDate: toDateKey() })))
      .catch(() => {});
  }, []);

  // 打开 App / 回到前台时结算衰减（每天一次）
  useEffect(() => {
    runDecayIfNeeded().catch(() => {});
    const onVisible = () => {
      if (document.visibilityState === 'visible') runDecayIfNeeded().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const onRecord = loc.pathname.startsWith('/record');

  return (
    <div className={styles.app}>
      <div className={styles.statusBand} aria-hidden="true" />
      <Outlet />
      <nav className={styles.nav}>
        {NAV_LEFT.map((n) => (
          <NavItem key={n.to} {...n} />
        ))}
        <button type="button" className={`${styles.fab} px-corner ${onRecord ? styles.fabActive : ''}`} onClick={() => nav('/record')} aria-label="记一笔">
          <Sprite grid={icon('edit', '#3b2412')} scale={2} />
          <span>记一笔</span>
        </button>
        {NAV_RIGHT.map((n) => (
          <NavItem key={n.to} {...n} />
        ))}
      </nav>
    </div>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return <main className={styles.page}>{children}</main>;
}

/**
 * 页面顶栏：吸顶。标题行下面固定留一行"状态行"，平时显示页面副标题，
 * 有提示（成就解锁等）时显示提示——这样提示永远不会盖住任何可点的东西。
 */
export function PageHeader({ title, left, right, subtitle }: { title: string; left?: React.ReactNode; right?: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerRow}>
        {left}
        <h1>{title}</h1>
        {right}
      </div>
      <div className={styles.statusLine}>
        <ToastLine fallback={subtitle} />
      </div>
    </header>
  );
}
