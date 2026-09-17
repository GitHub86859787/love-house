import { lazy, Suspense } from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './Layout';
import { HomePage } from '@/pages/HomePage';
import { PersonDetailPage } from '@/pages/PersonDetailPage';
import { PersonFormPage } from '@/pages/PersonFormPage';
import { RecordPage } from '@/pages/RecordPage';
import { TooltipProvider } from '@/ui/Tooltip';
import { MilestoneWatcher } from '@/features/milestones/MilestoneWatcher';
import { AchievementWatcher } from '@/features/collection/AchievementWatcher';
import { BookJobWatcher } from '@/features/fortune/BookJobWatcher';
import { ToastProvider } from '@/ui/Toast';
import { Page } from './Layout';

// 不常进的页面按需加载，首屏只带村口 / 人物 / 记一笔
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const CollectionPage = lazy(() => import('@/pages/CollectionPage').then((m) => ({ default: m.CollectionPage })));
const FortunePage = lazy(() => import('@/pages/FortunePage').then((m) => ({ default: m.FortunePage })));
const SelfCheckPage = lazy(() => import('@/pages/SelfCheckPage').then((m) => ({ default: m.SelfCheckPage })));
const ReviewPage = lazy(() => import('@/pages/ReviewPage').then((m) => ({ default: m.ReviewPage })));

function Loading() {
  return (
    <Page>
      <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)', padding: 24 }}>正在翻页……</p>
    </Page>
  );
}
const L = (el: React.ReactNode) => <Suspense fallback={<Loading />}>{el}</Suspense>;

const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/person/new', element: <PersonFormPage /> },
      { path: '/person/:id', element: <PersonDetailPage /> },
      { path: '/person/:id/edit', element: <PersonFormPage /> },
      { path: '/record', element: <RecordPage /> },
      { path: '/fortune', element: L(<FortunePage />) },
      { path: '/selfcheck', element: L(<SelfCheckPage />) },
      { path: '/review', element: L(<ReviewPage />) },
      { path: '/collection', element: L(<CollectionPage />) },
      { path: '/settings', element: L(<SettingsPage />) },
    ],
  },
]);

export function App() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
        <MilestoneWatcher />
        <AchievementWatcher />
        <BookJobWatcher />
      </TooltipProvider>
    </ToastProvider>
  );
}
