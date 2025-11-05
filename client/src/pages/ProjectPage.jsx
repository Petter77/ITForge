import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import TeamManagement from '../components/TeamManagement';

const ProjectPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('kanban');

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/projects/${id}`);
      setProject(response.data.project);
    } catch (err) {
      console.error('Error fetching project:', err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'kanban', name: 'Kanban', icon: '📋' },
    { id: 'gantt', name: 'Gantt', icon: '📊' },
    { id: 'backlog', name: 'Backlog', icon: '📝' },
    { id: 'team', name: 'Team', icon: '👥' },
    { id: 'reports', name: 'Reports', icon: '📈' },
    { id: 'settings', name: 'Settings', icon: '⚙️' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-[#4E86D9] hover:text-[#3d6bb8]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const TabContent = () => {
    switch (activeTab) {
      case 'kanban':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Kanban Board</h2>
            <p className="text-gray-600">
              Your Kanban board will be displayed here. Drag and drop tasks between columns to manage your workflow.
            </p>
            <div className="mt-8 grid grid-cols-4 gap-4">
              {['Backlog', 'To Do', 'In Progress', 'Done'].map((column) => (
                <div key={column} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">{column}</h3>
                  <p className="text-sm text-gray-500">No tasks yet</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'gantt':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Gantt Chart</h2>
            <p className="text-gray-600">
              Interactive Gantt chart showing project timeline, dependencies, and task scheduling will be displayed here.
            </p>
            <div className="mt-8 bg-gray-50 rounded-lg p-8 border border-gray-200">
              <p className="text-center text-gray-500">Gantt chart placeholder</p>
            </div>
          </div>
        );
      case 'backlog':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Backlog & Sprints</h2>
            <p className="text-gray-600 mb-4">
              Manage your product backlog, plan sprints, and track progress.
            </p>
            <div className="mt-8 space-y-4">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Product Backlog</h3>
                <p className="text-sm text-gray-500">No backlog items yet</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Active Sprints</h3>
                <p className="text-sm text-gray-500">No active sprints</p>
              </div>
            </div>
          </div>
        );
      case 'team':
        return <TeamManagement projectId={project.id} userRole={project.role} />;
      case 'reports':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Reports & Analytics</h2>
            <p className="text-gray-600 mb-6">
              View project progress, team workload, and detailed analytics.
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Project Progress</h3>
                <p className="text-sm text-gray-500">No data available</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Team Workload</h3>
                <p className="text-sm text-gray-500">No data available</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Burn-down Chart</h3>
                <p className="text-sm text-gray-500">No data available</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Velocity</h3>
                <p className="text-sm text-gray-500">No data available</p>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Project Settings</h2>
            <p className="text-gray-600 mb-6">
              Configure project settings, permissions, and integrations.
            </p>
            <div className="mt-8 space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">General Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                    <input
                      type="text"
                      value={project.name}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={project.description || ''}
                      disabled
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Integrations</h3>
                <p className="text-sm text-gray-500">No integrations configured</p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-black mb-2">{project.name}</h1>
                {project.description && (
                  <p className="text-gray-600 text-lg">{project.description}</p>
                )}
              </div>
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-700">
                {project.role === 'owner' ? 'Owner' : 'Member'}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-[#4E86D9] text-[#4E86D9]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <TabContent />
        </div>
      </div>
    </div>
  );
};

export default ProjectPage;

