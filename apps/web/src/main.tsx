import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!clientId) {
  // eslint-disable-next-line no-console
  console.warn('VITE_GOOGLE_CLIENT_ID is not set. Google Sign-In will not work.');
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId ?? ''}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
