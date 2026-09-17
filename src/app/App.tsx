import { createHashRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './Layout';
import { HomePage } from '@/pages/HomePage';
import { PersonDetailPage } from '@/pages/PersonDetailPage';
import { PersonFormPage } from '@/pages/PersonFormPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { CollectionPage } from '@/pages/CollectionPage';
import { RecordPage } from '@/pages/RecordPage';
import { FortunePage } from '@/pages/FortunePage';
import { SelfCheckPage } from '@/pages/SelfCheckPage';
import { TooltipProvider } from '@/ui/Tooltip';
import { MilestoneWatcher } from '@/features/milestones/MilestoneWatcher';
import { AchievementWatcher } from '@/features/collection/AchievementWatcher';
import { ToastProvider } from '@/ui/Toast';

const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/person/new', element: <PersonFormPage /> },
      { path: '/person/:id', element: <PersonDetailPage /> },
      { path: '/person/:id/edit', element: <PersonFormPage /> },
      { path: '/record', element: <RecordPage /> },
      { path: '/fortune', element: <FortunePage /> },
      { path: '/selfcheck', element: <SelfCheckPage /> },
      { path: '/collection', element: <CollectionPage /> },
      { path: '/settings', element: <SettingsPage /> },
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
      </TooltipProvider>
    </ToastProvider>
  );
}
