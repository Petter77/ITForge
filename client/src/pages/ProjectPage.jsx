import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import TeamManagement from '../components/TeamManagement';
import KanbanBoard from '../components/KanbanBoard';
import BacklogAndSprints from '../components/BacklogAndSprints';
import ProjectSettings from '../components/ProjectSettings';
import RequirementsManagement from '../components/RequirementsManagement';
import RiskManagement from '../components/RiskManagement';
import RoleBadge from '../components/RoleBadge';
import GanttView from '../components/GanttView';

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
    { id: 'kanban', name: 'Kanban'},
    { id: 'gantt', name: 'Gantt'},
    { id: 'backlog', name: 'Backlog'},
    { id: 'requirements', name: 'Wymagania'},
    { id: 'risks', name: 'Ryzyka'},
    { id: 'team', name: 'Zespół'},
    { id: 'settings', name: 'Ustawienia'},
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Ładowanie projektu...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Projekt nie został znaleziony</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-[#4E86D9] hover:text-[#3d6bb8]"
          >
            Powrót do Panelu
          </button>
        </div>
      </div>
    );
  }

  const TabContent = () => {
    switch (activeTab) {
      case 'kanban':
        return project?.id ? <KanbanBoard projectId={project.id} userRole={project.role} /> : null;
      case 'gantt':
        return project?.id ? <GanttView projectId={project.id} userRole={project.role} /> : null;
      case 'backlog':
        return project?.id ? <BacklogAndSprints projectId={project.id} userRole={project.role} /> : null;
      case 'requirements':
        return project?.id ? <RequirementsManagement projectId={project.id} userRole={project.role} /> : null;
      case 'risks':
        return project?.id ? <RiskManagement projectId={project.id} userRole={project.role} /> : null;
      case 'team':
        return <TeamManagement projectId={project.id} userRole={project.role} />;
      case 'settings':
        return (
          <ProjectSettings
            project={project}
            onProjectUpdate={(updatedProject) => {
              setProject(updatedProject);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar Navigation */}
      <div className="w-56 bg-surface border-r border-default flex-shrink-0">
        <div className="p-6">
          {/* Header */}
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-muted hover:text-primary mb-6 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Powrót do Panelu
          </button>
          <div className="mb-6">
            <h1 className="text-xl font-bold text-primary mb-3">{project.name}</h1>
            <RoleBadge role={project.role} />
          </div>

          {/* Vertical Tabs */}
          <nav className="space-y-1" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full text-left py-3 px-4 rounded-lg font-medium text-sm
                  ${activeTab === tab.id ? 'sidebar-tab-active' : 'sidebar-tab'}
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="w-full h-full py-8 px-6">
          <TabContent />
        </div>
      </div>
    </div>
  );
};

export default ProjectPage;

