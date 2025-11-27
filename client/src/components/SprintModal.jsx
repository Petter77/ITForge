import { useState, useEffect } from 'react';
import api from '../utils/api';
import ConfirmModal from './ConfirmModal';

const SprintModal = ({ isOpen, onClose, sprint, projectId, onSave, onDelete }) => {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('planned');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (sprint) {
        setName(sprint.name || '');
        setGoal(sprint.goal || '');
        setStartDate(sprint.start_date ? sprint.start_date.split('T')[0] : '');
        setEndDate(sprint.end_date ? sprint.end_date.split('T')[0] : '');
        setStatus(sprint.status || 'planned');
      } else {
        setName('');
        setGoal('');
        setStartDate('');
        setEndDate('');
        setStatus('planned');
      }
      setError('');
    }
  }, [isOpen, sprint]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!onSave) return;

    setError('');
    setLoading(true);

    try {
      const sprintData = {
        name,
        goal: goal || null,
        startDate: startDate || null,
        endDate: endDate || null,
        status,
      };

      if (sprint) {
        await api.put(`/projects/${projectId}/sprints/${sprint.id}`, sprintData);
      } else {
        await api.post(`/projects/${projectId}/sprints`, sprintData);
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving sprint:', err);
      setError(err.response?.data?.message || 'Nie udało się zapisać sprintu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sprint || !onDelete) return;

    setLoading(true);
    try {
      await onDelete(sprint.id);
      onClose();
    } catch (err) {
      console.error('Error deleting sprint:', err);
      setError(err.response?.data?.message || 'Nie udało się usunąć sprintu');
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
              {sprint ? 'Edytuj sprint' : 'Nowy sprint'}
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
                Nazwa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                placeholder="np. Sprint 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cel sprintu</label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                placeholder="Opisz cel sprintu"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data rozpoczęcia</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data zakończenia</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
              >
                <option value="planned">Zaplanowany</option>
                <option value="active">Aktywny</option>
                <option value="completed">Zakończony</option>
                <option value="cancelled">Anulowany</option>
              </select>
            </div>

            <div className="flex justify-between items-center pt-4">
              {sprint && onDelete && (
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
                  {loading ? 'Zapisywanie...' : sprint ? 'Zaktualizuj' : 'Utwórz'}
                </button>
              </div>
            </div>
          </form>

          <ConfirmModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            title="Usuń sprint"
            message="Czy na pewno chcesz usunąć ten sprint? Wszystkie elementy zostaną przeniesione do backlogu. Tej operacji nie można cofnąć."
            confirmText="Usuń"
            cancelText="Anuluj"
            type="danger"
          />
        </div>
      </div>
    </div>
  );
};

export default SprintModal;

