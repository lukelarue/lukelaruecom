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

const requiresGoogleProvider = !env.authMock && !env.googleLoginMock;
const missingGoogleClientId = requiresGoogleProvider && !env.googleClientId;

if (missingGoogleClientId) {
  // eslint-disable-next-line no-console
  console.error('VITE_GOOGLE_CLIENT_ID is required in production environments.');
}

const appContent = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

const app = (
  <React.StrictMode>
    {missingGoogleClientId ? (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="max-w-md space-y-3 rounded-2xl border border-rose-500/40 bg-zinc-900/80 p-6 text-center shadow-xl">
          <h1 className="text-xl font-semibold text-rose-300">Configuration required</h1>
          <p className="text-sm text-zinc-300">
            Google Sign-In is unavailable because <code className="font-mono text-rose-200">VITE_GOOGLE_CLIENT_ID</code> is not set.
          </p>
          <p className="text-xs text-zinc-500">
            Update the deployed environment with the Google OAuth client ID to re-enable authentication.
          </p>
        </div>
      </div>
    ) : requiresGoogleProvider ? (
      <GoogleOAuthProvider clientId={env.googleClientId}>
        {appContent}
      </GoogleOAuthProvider>
    ) : (
      appContent
    )}
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(app);
