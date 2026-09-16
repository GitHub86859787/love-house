import { NavLink, Outlet } from 'react-router-dom';
import styles from './App.module.css';
import { Sprite } from '@/pixel/Sprite';
import { icon, type IconName } from '@/pixel/sprites/icons';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: '村口', icon: 'village' },
  { to: '/collection', label: '图鉴', icon: 'book' },
  { to: '/settings', label: '设置', icon: 'gear' },
];

export function Layout() {
  return (
    <div className={styles.app}>
      <Outlet />
      <nav className={styles.nav}>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}>
            {({ isActive }) => (
              <>
                <Sprite grid={icon(n.icon, isActive ? '#f5c542' : '#e8d5a3')} scale={2} />
                <span>{n.label}</span>
              </>
            )}
          </NavLink>
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
