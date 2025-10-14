import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { LobbyPage } from '@/pages/LobbyPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

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
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <LobbyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
