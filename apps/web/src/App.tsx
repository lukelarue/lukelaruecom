import { HomePage } from '@/pages/HomePage';
import { AuthProvider } from '@/context/AuthContext';

const App = () => {
  return (
    <AuthProvider>
      <HomePage />
    </AuthProvider>
  );
};

export default App;
