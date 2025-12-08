import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext'; // <--- Добавьте это

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Добавьте AuthProvider здесь */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);