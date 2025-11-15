import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import AlertModal from './AlertModal';
import BacklogItemModal from './BacklogItemModal';
import BacklogItemCard from './BacklogItemCard';

const SprintView = ({ sprint, projectId, userRole, onBack, onSprintUpdate, onSprintDelete }) => {
  const { user } = useAuth();
  const canEdit = userRole !== 'observer';
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [itemModal, setItemModal] = useState({ isOpen: false, item: null });
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  useEffect(() => {
    if (sprint) {
      fetchData();
    }
  }, [sprint, projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch items for this sprint
      const itemsResponse = await api.get(`/projects/${projectId}/backlog`, {
        params: { sprintId: sprint.id },
      });
      setItems(itemsResponse.data.items || []);

      // Fetch members
      const membersResponse = await api.get(`/projects/${projectId}/members`);
      setMembers(membersResponse.data.members || []);
    } catch (err) {
      console.error('Error fetching sprint data:', err);
      setError('Nie udało się załadować danych sprintu');
    } finally {
      setLoading(false);
    }
  };

  const handleItemSave = () => {
    fetchData();
    setItemModal({ isOpen: false, item: null });
    setAlertModal({
      isOpen: true,
      title: 'Sukces',
      message: itemModal.item ? 'Element został zaktualizowany' : 'Element został utworzony',
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
        message: 'Element został usunięty pomyślnie',
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-300';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
      case 'planned': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Aktywny';
      case 'completed': return 'Zakończony';
      case 'cancelled': return 'Anulowany';
      case 'planned': return 'Zaplanowany';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-600">Ładowanie sprintu...</div>
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
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Powrót do listy sprintów
        </button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{sprint.name}</h2>
            {sprint.goal && (
              <p className="text-gray-600 mb-3">{sprint.goal}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {sprint.start_date && (
                <span>Od: {formatDate(sprint.start_date)}</span>
              )}
              {sprint.end_date && (
                <span>Do: {formatDate(sprint.end_date)}</span>
              )}
              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(sprint.status)}`}>
                {getStatusText(sprint.status)}
              </span>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button
                onClick={() => onSprintUpdate(sprint)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Edytuj sprint
              </button>
              <button
                onClick={() => onSprintDelete(sprint.id)}
                className="px-4 py-2 text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
              >
                Usuń sprint
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Wszystkie elementy</div>
          <div className="text-2xl font-bold text-gray-900">{items.length}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">W trakcie</div>
          <div className="text-2xl font-bold text-yellow-600">
            {items.filter(i => i.status === 'in_progress').length}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Zrobione</div>
          <div className="text-2xl font-bold text-green-600">
            {items.filter(i => i.status === 'done').length}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Elementy sprintu</h3>
        {canEdit && (
          <button
            onClick={() => setItemModal({ isOpen: true, item: null })}
            className="px-4 py-2 bg-[#4E86D9] text-white rounded-md hover:bg-[#3d6bb8] transition-colors"
          >
            + Dodaj element
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">Brak elementów w tym sprincie</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <BacklogItemCard
              key={item.id}
              item={item}
              sprints={[sprint]}
              onEdit={() => setItemModal({ isOpen: true, item })}
              onDelete={handleItemDelete}
              onMoveToSprint={() => {}}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {itemModal.isOpen && (
        <BacklogItemModal
          isOpen={itemModal.isOpen}
          onClose={() => setItemModal({ isOpen: false, item: null })}
          item={itemModal.item}
          projectId={projectId}
          sprints={[sprint]}
          members={members}
          defaultSprintId={sprint.id}
          hideSprintSelection={true}
          onSave={handleItemSave}
          onDelete={canEdit ? handleItemDelete : null}
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

export default SprintView;

