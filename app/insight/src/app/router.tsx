import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './app';
import HomePage from './pages/home';
import AboutPage from './pages/about';
import DashboardPage from './pages/dashboard';
import SourceDetailPage from './pages/source-detail';
import EndpointDetailPage from './pages/endpoint-detail';
import DatatypeDetailPage from './pages/datatype-detail';

// Create router objects for each route
const router = createBrowserRouter(
  [
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
        {
          path: 'sources/:sourceId/endpoint',
          element: <Navigate to={params => `/sources/${params.sourceId}`} replace />,
        },
        {
          path: 'sources/:sourceId/endpoint/:endpointId',
          element: <EndpointDetailPage />,
        },
        {
          path: 'sources/:sourceId/datatype',
          element: <Navigate to={params => `./sources/${params.sourceId}`} replace />,
        },
        {
          path: 'sources/:sourceId/datatype/:datatypeId',
          element: <DatatypeDetailPage />,
        },
      ],
    },
  ],
  {
    // Use basename to ensure the router works when served from any path
    basename: '/',
  }
);

export default router;