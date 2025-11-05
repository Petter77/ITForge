import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-black mb-2">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-gray-600 text-lg">
              Manage your projects and collaborate with your team.
            </p>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Information</h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Email</dt>
                <dd className="text-base text-gray-900">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Full Name</dt>
                <dd className="text-base text-gray-900">
                  {user?.firstName} {user?.lastName}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Start</h2>
            <p className="text-gray-600 mb-4">
              Your dashboard is ready. Start by creating your first project.
            </p>
            <button className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-[#4E86D9] hover:bg-[#3d6bb8] rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4E86D9]">
              Create Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

