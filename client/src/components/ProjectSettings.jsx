import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import AlertModal from './AlertModal';
import ConfirmModal from './ConfirmModal';

const ProjectSettings = ({ project, onProjectUpdate }) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false });
  const [isEditing, setIsEditing] = useState(false);

  const canEdit = project?.role === 'owner' || project?.role === 'admin';
  const canDelete = project?.role === 'owner';

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
    }
  }, [project]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

    setError('');
    setLoading(true);

    try {
      const response = await api.put(`/projects/${project.id}`, {
        name,
        description: description || null,
      });

      setIsEditing(false);
      if (onProjectUpdate) {
        onProjectUpdate(response.data.project);
      }
      setAlertModal({
        isOpen: true,
        title: 'Sukces',
        message: 'Projekt został zaktualizowany pomyślnie',
        type: 'success',
      });
    } catch (err) {
      console.error('Error updating project:', err);
      setError(err.response?.data?.message || 'Nie udało się zaktualizować projektu');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(project.name || '');
    setDescription(project.description || '');
    setIsEditing(false);
    setError('');
  };

  const handleDeleteClick = () => {
    setDeleteConfirm({ isOpen: true });
  };

  const handleDelete = async () => {
    setDeleteConfirm({ isOpen: false });
    setLoading(true);

    try {
      await api.delete(`/projects/${project.id}`);
      setAlertModal({
        isOpen: true,
        title: 'Sukces',
        message: 'Projekt został usunięty pomyślnie',
        type: 'success',
      });
      // Navigate to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Error deleting project:', err);
      setLoading(false);
      setAlertModal({
        isOpen: true,
        title: 'Błąd',
        message: err.response?.data?.message || 'Nie udało się usunąć projektu',
        type: 'error',
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Ustawienia Projektu</h2>
        <p className="text-gray-600">
          Zarządzaj ustawieniami projektu, edytuj szczegóły i usuń projekt.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ustawienia Ogólne</h3>
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-medium text-[#4E86D9] bg-white border border-[#4E86D9] rounded-md hover:bg-[#4E86D9] hover:text-white transition-colors"
              >
                Edytuj
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nazwa Projektu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing || !canEdit}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Wprowadź nazwę projektu"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isEditing || !canEdit}
                rows={4}
                maxLength={2000}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Wprowadź opis projektu"
              />
              <p className="text-xs text-gray-500 mt-1">
                {description.length}/2000 znaków
              </p>
            </div>

            {isEditing && canEdit && (
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#4E86D9] text-white rounded-md hover:bg-[#3d6bb8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anuluj
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Project Information */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informacje o Projekcie</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Data utworzenia:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatDate(project?.createdAt)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Ostatnia aktualizacja:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatDate(project?.updatedAt)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Liczba członków:</span>
              <span className="text-sm font-medium text-gray-900">
                {project?.memberCount || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Twoja rola:</span>
              <span className="text-sm font-medium text-gray-900 capitalize">
                {project?.role === 'owner' ? 'Właściciel' : project?.role === 'admin' ? 'Administrator' : project?.role === 'member' ? 'Członek' : 'Obserwator'}
              </span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        {canDelete && (
          <div className="bg-red-50 rounded-lg p-6 border border-red-200">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Strefa Niebezpieczna</h3>
            <p className="text-sm text-red-700 mb-4">
              Usunięcie projektu jest nieodwracalne. Wszystkie dane projektu, zadania, backlogi i sprinty zostaną trwale usunięte.
            </p>
            <button
              onClick={handleDeleteClick}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Usuń projekt
            </button>
          </div>
        )}

        {!canEdit && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Uwaga:</strong> Tylko właściciel lub administrator projektu może edytować ustawienia.
            </p>
          </div>
        )}
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'info' })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false })}
        onConfirm={handleDelete}
        title="Usuń projekt"
        message={`Czy na pewno chcesz usunąć projekt "${project?.name}"? Ta operacja jest nieodwracalna. Wszystkie dane projektu zostaną trwale usunięte.`}
        confirmText="Usuń projekt"
        cancelText="Anuluj"
        type="danger"
      />
    </div>
  );
};

export default ProjectSettings;


