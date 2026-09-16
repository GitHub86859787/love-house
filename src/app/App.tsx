import { createHashRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './Layout';
import { HomePage } from '@/pages/HomePage';
import { PersonDetailPage } from '@/pages/PersonDetailPage';
import { PersonFormPage } from '@/pages/PersonFormPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { CollectionPage } from '@/pages/CollectionPage';
import { ToastProvider } from '@/ui/Toast';

const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/person/new', element: <PersonFormPage /> },
      { path: '/person/:id', element: <PersonDetailPage /> },
      { path: '/person/:id/edit', element: <PersonFormPage /> },
      { path: '/collection', element: <CollectionPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
]);

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
