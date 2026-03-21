import React from 'react';
import { createRoot } from 'react-dom/client';
import LandingPage from './pages/landing_page/LandingPage';
import ChatArea from './components/chat_area/chat_area';

// This targets the <div id="app"></div> inside your app/index.html
const container = document.getElementById('app');

if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <LandingPage />
            <ChatArea />
        </React.StrictMode>
    );
}