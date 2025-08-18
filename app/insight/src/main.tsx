import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './app/router';
import {IntrigProvider} from "@intrig/react";
import {PinContextProvider} from "@/components/pin-button";

const baseURL =
  import.meta.env.DEV
    ? import.meta.env.VITE_DEAMON_API
    : undefined;

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <IntrigProvider configs={{
      daemon_api: {
        baseURL
      }
    }}>
      <PinContextProvider>
        <RouterProvider router={router} />
      </PinContextProvider>
    </IntrigProvider>
  </StrictMode>,
);
