import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { RoleProvider } from './context/RoleContext';

const container = document.getElementById('root');

if (!container) {
    throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(container);

root.render(
    <React.StrictMode>
        <RoleProvider>
            <App />
        </RoleProvider>
    </React.StrictMode>,
);

