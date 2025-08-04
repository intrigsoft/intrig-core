import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './app/router';
import {IntrigProvider} from "@intrig/react";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <IntrigProvider configs={{
      deamon_api: {
        baseURL: 'http://localhost:3000'
      }
    }}>
      <RouterProvider router={router} />
    </IntrigProvider>
  </StrictMode>,
);
