import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import styles from './App.module.css';
import { Sprite } from '@/pixel/Sprite';
import { icon, type IconName } from '@/pixel/sprites/icons';
import { runDecayIfNeeded } from '@/features/scoring/runtime';

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

export function PageHeader({ title, left, right }: { title: string; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className={styles.header}>
      {left}
      <h1>{title}</h1>
      {right}
    </header>
  );
}
