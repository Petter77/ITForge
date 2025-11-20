import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Notifications from './Notifications';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!isAuthenticated) {
    return null; // Don't show navbar on login/register pages
  }

  return (
    <nav className="bg-black border-b border-gray-800 relative z-10">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-white tracking-tight">ITForge</h1>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-[#4E86D9] transition-colors"
              aria-label="Przełącz motyw"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2m0 18v2m11-11h-2M3 12H1m17.95 6.95-1.41-1.41M5.46 6.46 4.05 5.05m13.9 0-1.41 1.41M5.46 17.54 4.05 18.95" />
                </svg>
              )}
            </button>
            <Notifications />
            <span className="text-gray-300 text-sm">
              {user?.firstName} {user?.lastName}
            </span>
            <button
              onClick={logout}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#4E86D9] hover:bg-[#3d6bb8] transition-colors duration-200 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4E86D9] focus:ring-offset-black"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
