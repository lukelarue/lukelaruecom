import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { env } from '@/utils/env';

if (!env.googleClientId && !env.authMock && !env.googleLoginMock) {
  // eslint-disable-next-line no-console
  console.warn('VITE_GOOGLE_CLIENT_ID is not set. Google Sign-In will not work.');
}

const shouldWrapWithGoogleProvider = !env.authMock && !env.googleLoginMock;

const app = (
  <React.StrictMode>
    {shouldWrapWithGoogleProvider ? (
      <GoogleOAuthProvider clientId={env.googleClientId}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </GoogleOAuthProvider>
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(app);
