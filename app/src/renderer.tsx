import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
<<<<<<< Updated upstream
import { App } from './App';
import './index.css';

const el = document.getElementById('root');
if (!el) {
  throw new Error('Missing #root element');
=======
import App from './App';

const container = document.getElementById('root');

if (container) {
    const root = createRoot(container);
    root.render(
        <StrictMode>
            <App />
        </StrictMode>
    );
>>>>>>> Stashed changes
}
