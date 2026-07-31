import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { createWebDesktopApi } from './web-api';
import './styles.css';

if (!window.masterpiece) {
  document.documentElement.dataset.runtime = 'web';
  document.title = 'Masterpiece OS Web';
  window.masterpiece = createWebDesktopApi();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
