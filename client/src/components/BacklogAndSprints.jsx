import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import AlertModal from './AlertModal';
import SprintModal from './SprintModal';
import BacklogItemModal from './BacklogItemModal';
import SprintCard from './SprintCard';
import SprintView from './SprintView';
import BacklogItemCard from './BacklogItemCard';

const BacklogAndSprints = ({ projectId, userRole }) => {
  const { user } = useAuth();
  const canEdit = userRole !== 'observer';
  const [sprints, setSprints] = useState([]);
  const [backlogItems, setBacklogItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [sprintModal, setSprintModal] = useState({ isOpen: false, sprint: null });
  const [itemModal, setItemModal] = useState({ isOpen: false, item: null });
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch sprints
      const sprintsResponse = await api.get(`/projects/${projectId}/sprints`);
      setSprints(sprintsResponse.data.sprints || []);

      // Fetch backlog items (only if no sprint selected)
      if (!selectedSprint) {
        const backlogResponse = await api.get(`/projects/${projectId}/backlog`);
        setBacklogItems(backlogResponse.data.items || []);
      }

      // Fetch members
      const membersResponse = await api.get(`/projects/${projectId}/members`);
      setMembers(membersResponse.data.members || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Nie udało się załadować danych');
    } finally {
      setLoading(false);
    }
  };


  const handleSprintSave = () => {
    fetchData();
    setSprintModal({ isOpen: false, sprint: null });
    setAlertModal({
      isOpen: true,
      title: 'Sukces',
      message: sprintModal.sprint ? 'Sprint został zaktualizowany' : 'Sprint został utworzony',
      type: 'success',
    });
  };

  const handleSprintDelete = async (sprintId) => {
    try {
      await api.delete(`/projects/${projectId}/sprints/${sprintId}`);
      await fetchData();
      if (selectedSprint?.id === sprintId) {
        setSelectedSprint(null);
      }
      setAlertModal({
        isOpen: true,
        title: 'Sukces',
        message: 'Sprint został usunięty pomyślnie',
        type: 'success',
      });
    } catch (err) {
      console.error('Error deleting sprint:', err);
      setAlertModal({
        isOpen: true,
        title: 'Błąd',
        message: err.response?.data?.message || 'Nie udało się usunąć sprintu',
        type: 'error',
      });
    }
  };

  const handleSprintUpdate = (sprint) => {
    setSprintModal({ isOpen: true, sprint });
  };

  const handleSprintClick = (sprint) => {
    setSelectedSprint(sprint);
  };

  const handleBackToList = () => {
    setSelectedSprint(null);
    fetchData();
  };

  const handleItemSave = () => {
    fetchData();
    setItemModal({ isOpen: false, item: null });
    setAlertModal({
      isOpen: true,
      title: 'Sukces',
      message: itemModal.item ? 'Element backlogu został zaktualizowany' : 'Element backlogu został utworzony',
      type: 'success',
    });
  };

  const handleItemDelete = async (itemId) => {
    try {
      await api.delete(`/projects/${projectId}/backlog/items/${itemId}`);
      await fetchData();
      setAlertModal({
        isOpen: true,
        title: 'Sukces',
        message: 'Element backlogu został usunięty pomyślnie',
        type: 'success',
      });
    } catch (err) {
      console.error('Error deleting item:', err);
      setAlertModal({
        isOpen: true,
        title: 'Błąd',
        message: err.response?.data?.message || 'Nie udało się usunąć elementu',
        type: 'error',
      });
    }
  };

  // If a sprint is selected, show sprint view
  if (selectedSprint) {
    return (
      <SprintView
        sprint={selectedSprint}
        projectId={projectId}
        userRole={userRole}
        onBack={handleBackToList}
        onSprintUpdate={handleSprintUpdate}
        onSprintDelete={handleSprintDelete}
      />
    );
  }

  // Main view: List of sprints
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-600">Ładowanie sprintów...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Sprinty</h2>
        {canEdit && (
          <button
            onClick={() => setSprintModal({ isOpen: true, sprint: null })}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            + Nowy sprint
          </button>
        )}
      </div>

      {/* Sprint Cards */}
      {sprints.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">Brak sprintów</p>
          {canEdit && (
            <button
              onClick={() => setSprintModal({ isOpen: true, sprint: null })}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Utwórz pierwszy sprint
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sprints.map((sprint) => (
            <div
              key={sprint.id}
              onClick={() => handleSprintClick(sprint)}
              className="cursor-pointer"
            >
              <SprintCard
                sprint={sprint}
                onEdit={(e) => {
                  e.stopPropagation();
                  handleSprintUpdate(sprint);
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  handleSprintDelete(sprint.id);
                }}
                canEdit={canEdit}
              />
            </div>
          ))}
        </div>
      )}

      {/* Backlog Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Backlog Produktu</h3>
          {canEdit && (
            <button
              onClick={() => setItemModal({ isOpen: true, item: null })}
              className="px-4 py-2 bg-[#4E86D9] text-white rounded-md hover:bg-[#3d6bb8] transition-colors"
            >
              + Dodaj element
            </button>
          )}
        </div>
        {backlogItems.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">Brak elementów w backlogu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {backlogItems.map((item) => (
              <BacklogItemCard
                key={item.id}
                item={item}
                sprints={sprints}
                onEdit={() => setItemModal({ isOpen: true, item })}
                onDelete={handleItemDelete}
                onMoveToSprint={() => {}}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {itemModal.isOpen && (
        <BacklogItemModal
          isOpen={itemModal.isOpen}
          onClose={() => setItemModal({ isOpen: false, item: null })}
          item={itemModal.item}
          projectId={projectId}
          sprints={sprints}
          members={members}
          defaultSprintId={null}
          hideSprintSelection={!itemModal.item}
          onSave={handleItemSave}
          onDelete={canEdit ? handleItemDelete : null}
        />
      )}

      {sprintModal.isOpen && (
        <SprintModal
          isOpen={sprintModal.isOpen}
          onClose={() => setSprintModal({ isOpen: false, sprint: null })}
          sprint={sprintModal.sprint}
          projectId={projectId}
          onSave={handleSprintSave}
          onDelete={canEdit ? handleSprintDelete : null}
        />
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'info' })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};

export default BacklogAndSprints;

