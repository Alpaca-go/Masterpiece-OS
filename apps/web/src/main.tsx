import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { createWebRuntimeApi } from './web-api';
import './styles.css';

if (!window.masterpiece) {
  document.documentElement.dataset.runtime = 'web';
  document.title = 'Masterpiece OS Web';
  window.masterpiece = createWebRuntimeApi();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </AppErrorBoundary>
  </StrictMode>
);
