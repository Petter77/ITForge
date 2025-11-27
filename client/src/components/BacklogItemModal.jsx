import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ConfirmModal from './ConfirmModal';

const BacklogItemModal = ({ isOpen, onClose, item, projectId, sprints, members, defaultSprintId, onSave, onDelete, hideSprintSelection = false }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('story');
  const [priority, setPriority] = useState('medium');
  const [storyPoints, setStoryPoints] = useState('');
  const [status, setStatus] = useState('todo');
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [assignedTo, setAssignedTo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setTitle(item.title || '');
        setDescription(item.description || '');
        setType(item.type || 'story');
        setPriority(item.priority || 'medium');
        setStoryPoints(item.story_points || '');
        setStatus(item.status || 'todo');
        setSelectedSprintId(item.sprint_id || null);
        if (Array.isArray(item.assignedTo)) {
          setAssignedTo(item.assignedTo.map(u => u.id));
        } else {
          setAssignedTo([]);
        }
      } else {
        setTitle('');
        setDescription('');
        setType('story');
        setPriority('medium');
        setStoryPoints('');
        setStatus('todo');
        setSelectedSprintId(defaultSprintId || null);
        setAssignedTo([]);
      }
      setError('');
    }
  }, [isOpen, item, defaultSprintId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!onSave) return;

    setError('');
    setLoading(true);

    try {
      const finalSprintId = hideSprintSelection ? (defaultSprintId || null) : (selectedSprintId || null);
      
      const itemData = {
        title,
        description: description || null,
        type,
        priority,
        storyPoints: storyPoints ? parseInt(storyPoints) : null,
        status,
        ...(finalSprintId !== null && { sprintId: finalSprintId }),
        assignedTo: assignedTo.length > 0 ? assignedTo : [],
      };

      if (item) {
        await api.put(`/projects/${projectId}/backlog/items/${item.id}`, itemData);
      } else {
        await api.post(`/projects/${projectId}/backlog/items`, itemData);
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving backlog item:', err);
      setError(err.response?.data?.message || 'Nie udało się zapisać elementu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item || !onDelete) return;

    setLoading(true);
    try {
      await onDelete(item.id);
      onClose();
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err.response?.data?.message || 'Nie udało się usunąć elementu');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              {item ? 'Edytuj element backlogu' : 'Nowy element backlogu'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tytuł <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                placeholder="Wprowadź tytuł"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                placeholder="Wprowadź opis"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                >
                  <option value="story">User Story</option>
                  <option value="bug">Bug</option>
                  <option value="task">Task</option>
                  <option value="epic">Epic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priorytet</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                >
                  <option value="low">Niski</option>
                  <option value="medium">Średni</option>
                  <option value="high">Wysoki</option>
                  <option value="critical">Krytyczny</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Story Points</label>
                <input
                  type="number"
                  value={storyPoints}
                  onChange={(e) => setStoryPoints(e.target.value)}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                  placeholder="np. 5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                >
                  <option value="todo">Do zrobienia</option>
                  <option value="in_progress">W trakcie</option>
                  <option value="done">Zrobione</option>
                </select>
              </div>
            </div>

            {!hideSprintSelection && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sprint</label>
                <select
                  value={selectedSprintId || ''}
                  onChange={(e) => setSelectedSprintId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                >
                  <option value="">Brak (Backlog)</option>
                  {sprints.map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Przypisane do</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                {members.filter(member => member.role !== 'observer').map((member) => {
                  const isSelected = assignedTo.includes(member.userId);
                  return (
                    <label
                      key={member.userId}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignedTo([...assignedTo, member.userId]);
                          } else {
                            setAssignedTo(assignedTo.filter(id => id !== member.userId));
                          }
                        }}
                        className="w-4 h-4 text-[#4E86D9] border-gray-300 rounded focus:ring-[#4E86D9]"
                      />
                      <span className="text-sm text-gray-700">
                        {member.firstName} {member.lastName} ({member.email})
                      </span>
                    </label>
                  );
                })}
                {members.filter(member => member.role !== 'observer').length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">Brak członków dostępnych do przypisania</p>
                )}
              </div>
              {assignedTo.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Wybrano: {assignedTo.length} {assignedTo.length === 1 ? 'osobę' : 'osób'}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-4">
              {item && onDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title="Usuń"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              <div className="flex justify-end gap-3 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#4E86D9] text-white rounded-md hover:bg-[#3d6bb8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Zapisywanie...' : item ? 'Zaktualizuj' : 'Utwórz'}
                </button>
              </div>
            </div>
          </form>

          <ConfirmModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            title="Usuń element backlogu"
            message="Czy na pewno chcesz usunąć ten element backlogu? Tej operacji nie można cofnąć."
            confirmText="Usuń"
            cancelText="Anuluj"
            type="danger"
          />
        </div>
      </div>
    </div>
  );
};

export default BacklogItemModal;

