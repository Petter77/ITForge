import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ConfirmModal from './ConfirmModal';

const TaskModal = ({ isOpen, onClose, task, columnId, columns, members, projectId, onSave, onDelete, readOnly = false }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColumnId, setSelectedColumnId] = useState(null);
  const [assignedTo, setAssignedTo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title || '');
        setDescription(task.description || '');
        setSelectedColumnId(task.columnId || columnId);
        // Handle both array and single object for backward compatibility
        if (Array.isArray(task.assignedTo)) {
          setAssignedTo(task.assignedTo.map(u => u.id));
        } else if (task.assignedTo) {
          setAssignedTo([task.assignedTo.id]);
        } else {
          setAssignedTo([]);
        }
      } else {
        setTitle('');
        setDescription('');
        setSelectedColumnId(columnId);
        setAssignedTo([]);
      }
      setError('');
    }
  }, [isOpen, task, columnId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent submission in read-only mode
    if (readOnly || !onSave) {
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const taskData = {
        title,
        description: description || null,
        columnId: selectedColumnId,
        assignedTo: assignedTo.length > 0 ? assignedTo : [],
      };

      if (task) {
        // Update existing task
        await api.put(`/projects/${projectId}/kanban/tasks/${task.id}`, taskData);
      } else {
        // Create new task
        await api.post(`/projects/${projectId}/kanban/tasks`, taskData);
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving task:', err);
      setError(err.response?.data?.message || 'Nie udało się zapisać zadania');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;
    
    setLoading(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(err.response?.data?.message || 'Nie udało się usunąć zadania');
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
              {readOnly ? 'Szczegóły zadania' : task ? 'Edytuj zadanie' : 'Nowe zadanie'}
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
                disabled={readOnly}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Wprowadź tytuł zadania"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opis
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={readOnly}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Wprowadź opis zadania"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kolumna
              </label>
              <select
                value={selectedColumnId || ''}
                onChange={(e) => setSelectedColumnId(parseInt(e.target.value))}
                disabled={readOnly}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Przypisane do
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                {members.filter(member => member.role !== 'observer').map((member) => {
                  const isSelected = assignedTo.includes(member.userId);
                  return (
                    <label
                      key={member.userId}
                      className={`flex items-center space-x-2 p-2 rounded ${
                        readOnly ? 'cursor-default' : 'hover:bg-gray-50 cursor-pointer'
                      }`}
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
                        disabled={readOnly}
                        className="w-4 h-4 text-[#4E86D9] border-gray-300 rounded focus:ring-[#4E86D9] disabled:cursor-not-allowed"
                      />
                      <span className="text-sm text-gray-700">
                        {member.firstName} {member.lastName} ({member.email})
                      </span>
                    </label>
                  );
                })}
                {members.filter(member => member.role !== 'observer').length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    Brak członków dostępnych do przypisania
                  </p>
                )}
              </div>
              {assignedTo.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Wybrano: {assignedTo.length} {assignedTo.length === 1 ? 'osobę' : 'osób'}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-4">
              {task && onDelete && !readOnly && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                >
                  Usuń
                </button>
              )}
              <div className="flex justify-end gap-3 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  {readOnly ? 'Zamknij' : 'Anuluj'}
                </button>
                {!readOnly && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-[#4E86D9] text-white rounded-md hover:bg-[#3d6bb8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Zapisywanie...' : task ? 'Zaktualizuj' : 'Utwórz'}
                  </button>
                )}
              </div>
            </div>
          </form>

          <ConfirmModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            title="Usuń zadanie"
            message="Czy na pewno chcesz usunąć to zadanie? Tej operacji nie można cofnąć."
            confirmText="Usuń"
            cancelText="Anuluj"
            type="danger"
          />
        </div>
      </div>
    </div>
  );
};

export default TaskModal;

