import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { env } from '@/utils/env';

if (!env.googleClientId && !env.authMock) {
  // eslint-disable-next-line no-console
  console.warn('VITE_GOOGLE_CLIENT_ID is not set. Google Sign-In will not work.');
}

const app = (
  <React.StrictMode>
    {env.authMock ? (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    ) : (
      <GoogleOAuthProvider clientId={env.googleClientId}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </GoogleOAuthProvider>
    )}
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(app);
