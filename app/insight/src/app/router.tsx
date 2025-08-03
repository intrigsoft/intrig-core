import { createBrowserRouter } from 'react-router-dom';
import App from './app';
import HomePage from './pages/home';
import AboutPage from './pages/about';
import DashboardPage from './pages/dashboard';

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
    ],
  },
]);

export default router;