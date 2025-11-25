import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { LobbyPage } from '@/pages/LobbyPage';
import { AuthProvider } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { useAuthContext } from '@/hooks/useAuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { MainLayoutRoute } from '@/components/Layout/MainLayout';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { session, loading } = useAuthContext();

  if (loading) {
    return <LoadingScreen message="Loading your lobby" />;
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <ChatProvider defaultChannel={{ channelType: 'global' }}>
        <Routes>
          {/* Login page - no layout, just centered Google sign-in */}
          <Route path="/" element={<HomePage />} />

          {/* Protected routes with main layout (chat sidebar) */}
          <Route element={<MainLayoutRoute />}>
            <Route
              path="/lobby"
              element={
                <ProtectedRoute>
                  <LobbyPage />
                </ProtectedRoute>
              }
            />
            {/* Redirect /profile to /lobby (profile is now embedded) */}
            <Route path="/profile" element={<Navigate to="/lobby" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ChatProvider>
    </AuthProvider>
  );
};

export default App;
