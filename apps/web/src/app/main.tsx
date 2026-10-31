import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryProvider } from './query/QueryProvider';
import { router } from './router';
import './styles/index.css';

/** "app" layer: wires everything together — providers, router, global styles. */
const root = document.getElementById('root');
if (!root) throw new Error('#root element not found in index.html');

createRoot(root).render(
  <StrictMode>
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  </StrictMode>,
);
