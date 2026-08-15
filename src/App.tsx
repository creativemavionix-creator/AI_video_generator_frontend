import { useEffect, useState } from 'react';
import VideoGeneratorWorkspace from './components/product/modules/VideoGeneratorWorkspace';
import LoginPage from './components/auth/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Clapperboard } from 'lucide-react';

type ThemeMode = 'light' | 'dark';

function AppContent() {
  const { user, loading } = useAuth();
  
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = window.localStorage.getItem('mavionix-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    window.localStorage.setItem('mavionix-theme', theme);
  }, [theme]);

  const handleThemeToggle = () => setTheme((value) => (value === 'dark' ? 'light' : 'dark'));

  const handleViewChange = (view: string, slug?: string) => {
    console.log('navigate ->', view, slug);
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-[#07070f] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white animate-pulse" style={{ backgroundImage: 'linear-gradient(135deg, #C800FF 0%, #7C3AED 100%)' }}>
          <Clapperboard size={24} />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 animate-pulse">Initializing MaVionix Suite...</p>
      </div>
    );
  }

  // If unauthenticated, show LoginPage
  if (!user) {
    return <LoginPage theme={theme} onThemeToggle={handleThemeToggle} />;
  }

  // If authenticated, render Workspace
  return (
    <VideoGeneratorWorkspace
      onViewChange={handleViewChange}
      theme={theme}
      onThemeToggle={handleThemeToggle}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
