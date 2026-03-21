import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const el = document.getElementById('app');
if (!el) {
  throw new Error('Missing #app element');
}

createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
