import { useState, useEffect } from 'react';
import api from '../utils/api';
import AlertModal from './AlertModal';
import ConfirmModal from './ConfirmModal';

const RequirementsManagement = ({ projectId, userRole }) => {
  const canEdit = userRole === 'owner' || userRole === 'admin';
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [requirementModal, setRequirementModal] = useState({ isOpen: false, requirement: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, requirementId: null, requirementTitle: '' });
  const [filterType, setFilterType] = useState('all'); // all, functional, non-functional
  const [filterStatus, setFilterStatus] = useState('all'); // all, draft, approved, implemented, rejected

  useEffect(() => {
    fetchRequirements();
  }, [projectId]);

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/projects/${projectId}/requirements`);
      setRequirements(response.data.requirements || []);
    } catch (err) {
      console.error('Error fetching requirements:', err);
      setError('Nie udało się załadować wymagań');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (requirementData) => {
    try {
      if (requirementModal.requirement) {
        // Update existing requirement
        await api.put(`/projects/${projectId}/requirements/${requirementModal.requirement.id}`, requirementData);
        setAlertModal({
          isOpen: true,
          title: 'Sukces',
          message: 'Wymaganie zostało zaktualizowane pomyślnie',
          type: 'success',
        });
      } else {
        // Create new requirement
        await api.post(`/projects/${projectId}/requirements`, requirementData);
        setAlertModal({
          isOpen: true,
          title: 'Sukces',
          message: 'Wymaganie zostało utworzone pomyślnie',
          type: 'success',
        });
      }
      setRequirementModal({ isOpen: false, requirement: null });
      await fetchRequirements();
    } catch (err) {
      console.error('Error saving requirement:', err);
      setAlertModal({
        isOpen: true,
        title: 'Błąd',
        message: err.response?.data?.message || 'Nie udało się zapisać wymagania',
        type: 'error',
      });
    }
  };

  const handleDeleteClick = (requirementId, requirementTitle) => {
    setDeleteConfirm({
      isOpen: true,
      requirementId: requirementId,
      requirementTitle: requirementTitle,
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.requirementId) return;

    try {
      await api.delete(`/projects/${projectId}/requirements/${deleteConfirm.requirementId}`);
      setDeleteConfirm({ isOpen: false, requirementId: null, requirementTitle: '' });
      await fetchRequirements();
      setAlertModal({
        isOpen: true,
        title: 'Sukces',
        message: 'Wymaganie zostało usunięte pomyślnie',
        type: 'success',
      });
    } catch (err) {
      console.error('Error deleting requirement:', err);
      setDeleteConfirm({ isOpen: false, requirementId: null, requirementTitle: '' });
      setAlertModal({
        isOpen: true,
        title: 'Błąd',
        message: err.response?.data?.message || 'Nie udało się usunąć wymagania',
        type: 'error',
      });
    }
  };

  const getTypeColor = (type) => {
    return type === 'functional' 
      ? 'bg-blue-100 text-blue-700 border-blue-300' 
      : 'bg-purple-100 text-purple-700 border-purple-300';
  };

  const getTypeText = (type) => {
    return type === 'functional' ? 'Funkcjonalne' : 'Niefunkcjonalne';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-300';
      case 'implemented': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-300';
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Zatwierdzone';
      case 'implemented': return 'Zaimplementowane';
      case 'rejected': return 'Odrzucone';
      case 'draft': return 'Szkic';
      default: return status;
    }
  };

  const filteredRequirements = requirements.filter(req => {
    const typeMatch = filterType === 'all' || req.type === filterType;
    const statusMatch = filterStatus === 'all' || req.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const functionalRequirements = filteredRequirements.filter(r => r.type === 'functional');
  const nonFunctionalRequirements = filteredRequirements.filter(r => r.type === 'non-functional');

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-600">Ładowanie wymagań...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Wymagania Projektu</h2>
          <p className="text-gray-600 mt-1">
            Zarządzaj wymaganiami funkcjonalnymi i niefunkcjonalnymi projektu.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setRequirementModal({ isOpen: true, requirement: null })}
            className="px-4 py-2 bg-[#4E86D9] text-white rounded-md hover:bg-[#3d6bb8] transition-colors"
          >
            + Dodaj wymaganie
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
          >
            <option value="all">Wszystkie</option>
            <option value="functional">Funkcjonalne</option>
            <option value="non-functional">Niefunkcjonalne</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
          >
            <option value="all">Wszystkie</option>
            <option value="draft">Szkic</option>
            <option value="approved">Zatwierdzone</option>
            <option value="implemented">Zaimplementowane</option>
            <option value="rejected">Odrzucone</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Requirements List */}
      {filteredRequirements.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">Brak wymagań</p>
          {canEdit && (
            <button
              onClick={() => setRequirementModal({ isOpen: true, requirement: null })}
              className="px-4 py-2 bg-[#4E86D9] text-white rounded-md hover:bg-[#3d6bb8] transition-colors"
            >
              Utwórz pierwsze wymaganie
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Functional Requirements */}
          {functionalRequirements.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Wymagania Funkcjonalne</h3>
              <div className="space-y-3">
                {functionalRequirements.map((requirement) => (
                  <RequirementCard
                    key={requirement.id}
                    requirement={requirement}
                    canEdit={canEdit}
                    onEdit={() => setRequirementModal({ isOpen: true, requirement })}
                    onDelete={() => handleDeleteClick(requirement.id, requirement.title)}
                    getTypeColor={getTypeColor}
                    getTypeText={getTypeText}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                    getStatusText={getStatusText}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Non-Functional Requirements */}
          {nonFunctionalRequirements.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Wymagania Niefunkcjonalne</h3>
              <div className="space-y-3">
                {nonFunctionalRequirements.map((requirement) => (
                  <RequirementCard
                    key={requirement.id}
                    requirement={requirement}
                    canEdit={canEdit}
                    onEdit={() => setRequirementModal({ isOpen: true, requirement })}
                    onDelete={() => handleDeleteClick(requirement.id, requirement.title)}
                    getTypeColor={getTypeColor}
                    getTypeText={getTypeText}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                    getStatusText={getStatusText}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Requirement Modal */}
      {requirementModal.isOpen && (
        <RequirementModal
          isOpen={requirementModal.isOpen}
          onClose={() => setRequirementModal({ isOpen: false, requirement: null })}
          requirement={requirementModal.requirement}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, requirementId: null, requirementTitle: '' })}
        onConfirm={handleDelete}
        title="Usuń wymaganie"
        message={`Czy na pewno chcesz usunąć wymaganie "${deleteConfirm.requirementTitle}"? Tej operacji nie można cofnąć.`}
        confirmText="Usuń"
        cancelText="Anuluj"
        type="danger"
      />

      {/* Alert Modal */}
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

// Requirement Card Component
const RequirementCard = ({ requirement, canEdit, onEdit, onDelete, getTypeColor, getTypeText, getPriorityColor, getStatusColor, getStatusText }) => {
  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs font-medium rounded border ${getTypeColor(requirement.type)}`}>
              {getTypeText(requirement.type)}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(requirement.status)}`}>
              {getStatusText(requirement.status)}
            </span>
            <div className={`w-2 h-2 rounded-full ${getPriorityColor(requirement.priority)}`} title={requirement.priority} />
          </div>
          <h4 className="font-semibold text-gray-900 mb-1">{requirement.title}</h4>
          {requirement.description && (
            <p className="text-sm text-gray-600 mb-2">{requirement.description}</p>
          )}
          <p className="text-xs text-gray-500">
            Utworzone przez: {requirement.createdBy.firstName} {requirement.createdBy.lastName}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={onEdit}
              className="text-gray-400 hover:text-gray-600"
              title="Edytuj"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-600"
              title="Usuń"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Requirement Modal Component
const RequirementModal = ({ isOpen, onClose, requirement, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('functional');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('draft');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (requirement) {
        setTitle(requirement.title || '');
        setDescription(requirement.description || '');
        setType(requirement.type || 'functional');
        setPriority(requirement.priority || 'medium');
        setStatus(requirement.status || 'draft');
      } else {
        setTitle('');
        setDescription('');
        setType('functional');
        setPriority('medium');
        setStatus('draft');
      }
      setError('');
    }
  }, [isOpen, requirement]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSave({
        title,
        description: description || null,
        type,
        priority,
        status,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Nie udało się zapisać wymagania');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              {requirement ? 'Edytuj wymaganie' : 'Nowe wymaganie'}
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
                placeholder="Wprowadź tytuł wymagania"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                placeholder="Wprowadź szczegółowy opis wymagania"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Typ <span className="text-red-500">*</span></label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
                >
                  <option value="functional">Funkcjonalne</option>
                  <option value="non-functional">Niefunkcjonalne</option>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4E86D9] focus:border-transparent"
              >
                <option value="draft">Szkic</option>
                <option value="approved">Zatwierdzone</option>
                <option value="implemented">Zaimplementowane</option>
                <option value="rejected">Odrzucone</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
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
                {loading ? 'Zapisywanie...' : requirement ? 'Zaktualizuj' : 'Utwórz'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequirementsManagement;

