import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@app/App';
import './styles/globals.css';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error(
    "Root mount node #root is missing from index.html. Don't move this without updating index.html.",
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
