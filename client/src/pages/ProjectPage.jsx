import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import TeamManagement from '../components/TeamManagement';
import KanbanBoard from '../components/KanbanBoard';
import RoleBadge from '../components/RoleBadge';

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
    { id: 'team', name: 'Zespół'},
    { id: 'reports', name: 'Raporty'},
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
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Wykres Gantta</h2>
            <p className="text-gray-600">
              Interaktywny wykres Gantta pokazujący harmonogram projektu, zależności i planowanie zadań zostanie wyświetlony tutaj.
            </p>
            <div className="mt-8 bg-gray-50 rounded-lg p-8 border border-gray-200">
              <p className="text-center text-gray-500">Wykres Gantta - miejsce na zawartość</p>
            </div>
          </div>
        );
      case 'backlog':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Backlog i Sprinty</h2>
            <p className="text-gray-600 mb-4">
              Zarządzaj backlogiem produktu, planuj sprinty i śledź postępy.
            </p>
            <div className="mt-8 space-y-4">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Backlog Produktu</h3>
                <p className="text-sm text-gray-500">Brak elementów w backlogu</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Aktywne Sprinty</h3>
                <p className="text-sm text-gray-500">Brak aktywnych sprintów</p>
              </div>
            </div>
          </div>
        );
      case 'team':
        return <TeamManagement projectId={project.id} userRole={project.role} />;
      case 'reports':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Raporty i Analizy</h2>
            <p className="text-gray-600 mb-6">
              Przeglądaj postęp projektu, obciążenie zespołu i szczegółowe analizy.
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Postęp Projektu</h3>
                <p className="text-sm text-gray-500">Brak dostępnych danych</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Obciążenie Zespołu</h3>
                <p className="text-sm text-gray-500">Brak dostępnych danych</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Wykres Burn-down</h3>
                <p className="text-sm text-gray-500">Brak dostępnych danych</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Prędkość</h3>
                <p className="text-sm text-gray-500">Brak dostępnych danych</p>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Ustawienia Projektu</h2>
            <p className="text-gray-600 mb-6">
              Skonfiguruj ustawienia projektu, uprawnienia i integracje.
            </p>
            <div className="mt-8 space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Ustawienia Ogólne</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa Projektu</label>
                    <input
                      type="text"
                      value={project.name}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
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
                <h3 className="font-semibold text-gray-900 mb-4">Integracje</h3>
                <p className="text-sm text-gray-500">Brak skonfigurowanych integracji</p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar Navigation */}
      <div className="w-56 bg-gray-50 border-r border-gray-200 flex-shrink-0">
        <div className="p-6">
          {/* Header */}
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-6 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Powrót do Panelu
          </button>
          <div className="mb-6">
            <h1 className="text-xl font-bold text-black mb-3">{project.name}</h1>
            <RoleBadge role={project.role} />
          </div>

          {/* Vertical Tabs */}
          <nav className="space-y-1" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full text-left py-3 px-4 rounded-lg font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'bg-[#4E86D9] text-white'
                      : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                  }
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

