import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return null; // Don't show navbar on login/register pages
  }

  return (
    <nav className="bg-black border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-white tracking-tight">ITForge</h1>
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-gray-300 text-sm">
              {user?.firstName} {user?.lastName}
            </span>
            <button
              onClick={logout}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#4E86D9] hover:bg-[#3d6bb8] transition-colors duration-200 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4E86D9] focus:ring-offset-black"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
