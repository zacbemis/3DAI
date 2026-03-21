import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatPage } from './chat/ChatPage';
import './index.css';

const el = document.getElementById('root');
if (!el) {
  throw new Error('Missing #root element');
}

createRoot(el).render(
  <StrictMode>
    <ChatPage />
  </StrictMode>,
);
