import { useState, useEffect } from 'react';
import api from '../utils/api';
import ConfirmModal from './ConfirmModal';

const ColumnModal = ({ isOpen, onClose, column, projectId, onSave, onDelete }) => {
  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (column) {
        setName(column.name || '');
        setOriginalName(column.name || '');
      } else {
        setName('');
        setOriginalName('');
      }
      setError('');
    }
  }, [isOpen, column]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!onSave) return;

    // If editing and name changed, show confirmation
    if (column && name.trim() !== originalName.trim()) {
      setShowSaveConfirm(true);
      return;
    }

    // If creating new column, save directly
    await performSave();
  };

  const performSave = async () => {
    setError('');
    setLoading(true);

    try {
      if (column) {
        await api.put(`/projects/${projectId}/kanban/columns/${column.id}`, { name });
      } else {
        await api.post(`/projects/${projectId}/kanban/columns`, { name });
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving column:', err);
      setError(err.response?.data?.message || 'Nie udało się zapisać kolumny');
    } finally {
      setLoading(false);
      setShowSaveConfirm(false);
    }
  };

  const handleDelete = async () => {
    if (!column || !onDelete) return;

    setLoading(true);
    try {
      await onDelete(column.id);
      onClose();
    } catch (err) {
      console.error('Error deleting column:', err);
      setError(err.response?.data?.message || 'Nie udało się usunąć kolumny');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              {column ? 'Edytuj kolumnę' : 'Nowa kolumna'}
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
                Nazwa kolumny <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                placeholder="np. Do zrobienia"
              />
            </div>

            <div className="flex justify-between items-center pt-4">
              {column && onDelete && (
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
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#4E86D9] text-white rounded-md hover:bg-[#3d6bb8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Zapisywanie...' : column ? 'Zaktualizuj' : 'Utwórz'}
                </button>
              </div>
            </div>
          </form>

          <ConfirmModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            title="Usuń kolumnę"
            message="Czy na pewno chcesz usunąć tę kolumnę? Tej akcji nie można cofnąć. Upewnij się, że kolumna nie zawiera zadań."
            confirmText="Usuń"
            cancelText="Anuluj"
            type="danger"
          />

          <ConfirmModal
            isOpen={showSaveConfirm}
            onClose={() => setShowSaveConfirm(false)}
            onConfirm={performSave}
            title="Zmiana nazwy kolumny"
            message={`Czy na pewno chcesz zmienić nazwę kolumny z "${originalName}" na "${name}"?`}
            confirmText="Zmień"
            cancelText="Anuluj"
            type="info"
          />
        </div>
      </div>
    </div>
  );
};

export default ColumnModal;

