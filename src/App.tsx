import { useState, useEffect } from 'react';
import Login from './components/Login';
import POS from './components/POS';

export default function App() {
  const [user, setUser] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('session_user');
    if (savedUser) {
      setUser(savedUser);
    }
    setIsReady(true);
  }, []);

  const handleLogin = (username: string) => {
    setUser(username);
    localStorage.setItem('session_user', username);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('session_user');
  };

  if (!isReady) return null;

  return (
    <div className="min-h-screen font-sans selection:bg-blue-100 selection:text-blue-900">
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <POS username={user} onLogout={handleLogout} />
      )}
    </div>
  );
}
