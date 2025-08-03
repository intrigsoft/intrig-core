# Insight Application

## React Router Implementation

This application uses React Router with router objects for navigation. The routing structure is similar to Next.js, where the directory structure in the `pages` folder represents the URL paths.

### Directory Structure

```
src/
├── app/
│   ├── pages/
│   │   ├── home/
│   │   │   └── index.tsx       # Route: /
│   │   ├── about/
│   │   │   └── index.tsx       # Route: /about
│   │   └── dashboard/
│   │       └── index.tsx       # Route: /dashboard
│   ├── app.tsx                 # Root layout with navigation
│   └── router.tsx              # Router configuration
└── main.tsx                    # Entry point
```

### Router Configuration

The router is configured in `src/app/router.tsx` using the `createBrowserRouter` function from React Router. Each route is defined as an object with a path and an element.

```tsx
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
```

### Adding New Routes

To add a new route:

1. Create a new directory in the `src/app/pages` folder with the name of your route
2. Create an `index.tsx` file in that directory with your page component
3. Add the route to the router configuration in `src/app/router.tsx`

For example, to add a "settings" page:

1. Create `src/app/pages/settings/index.tsx`
2. Add the route to the router configuration:

```tsx
{
  path: 'settings',
  element: <SettingsPage />,
}
```

### Running the Application

To run the application:

```bash
npx nx serve @intrig-core/insight
```

Then navigate to:
- Home: http://localhost:4200/
- About: http://localhost:4200/about
- Dashboard: http://localhost:4200/dashboard