import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './app';
import HomePage from './pages/home';
import AboutPage from './pages/about';
import DashboardPage from './pages/dashboard';
import SourceDetailPage from './pages/source-detail';

// Create router objects for each route
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'about',
        element: <AboutPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'sources',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'sources/:sourceId',
        element: <SourceDetailPage />,
      },
    ],
  },
]);

export default router;