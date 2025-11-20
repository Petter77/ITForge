import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';
import RoleBadge from './RoleBadge';

const TeamManagement = ({ projectId, userRole }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [adding, setAdding] = useState(false);
  
  // Modals
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, userId: null, memberName: '', mode: 'remove' });
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  useEffect(() => {
    fetchMembers();
  }, [projectId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/projects/${projectId}/members`);
      setMembers(response.data.members || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Nie udało się załadować członków zespołu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    setAdding(true);

    try {
      const response = await api.post(`/projects/${projectId}/members`, {
        email,
        role,
      });
      setMembers(response.data.members);
      setEmail('');
      setRole('member');
      setIsAddModalOpen(false);
      // Show success message
      setAlertModal({
        isOpen: true,
        title: 'Sukces',
        message: 'Zaproszenie zostało wysłane pomyślnie!',
        type: 'success',
      });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Nie udało się wysłać zaproszenia';
      setError(errorMessage);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const response = await api.put(`/projects/${projectId}/members/${userId}`, {
        role: newRole,
      });
      setMembers(response.data.members);
      setAlertModal({
        isOpen: true,
        title: 'Sukces',
        message: 'Rola członka została zaktualizowana pomyślnie',
        type: 'success',
      });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Nie udało się zaktualizować roli';
      setAlertModal({
        isOpen: true,
        title: 'Błąd',
        message: errorMessage,
        type: 'error',
      });
    }
  };

  const handleRemoveMemberClick = (userId, memberName) => {
    setConfirmModal({
      isOpen: true,
      userId,
      memberName,
      mode: 'remove',
    });
  };

  const handleLeaveProjectClick = () => {
    setConfirmModal({
      isOpen: true,
      userId: currentUser?.id || null,
      memberName: `${currentUser?.firstName || 'Ty'} ${currentUser?.lastName || ''}`.trim(),
      mode: 'leave',
    });
  };

  const handleRemoveMember = async () => {
    const { userId } = confirmModal;
    try {
      const response = await api.delete(`/projects/${projectId}/members/${userId}`);
      const isSelfRemoval = currentUser?.id === userId;

      if (isSelfRemoval) {
        setAlertModal({
          isOpen: true,
          title: 'Sukces',
          message: 'Opuściłeś projekt pomyślnie',
          type: 'success',
        });
        setTimeout(() => navigate('/dashboard'), 800);
      } else {
        setMembers(response.data.members);
        setAlertModal({
          isOpen: true,
          title: 'Sukces',
          message: 'Członek został usunięty pomyślnie',
          type: 'success',
        });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Nie udało się usunąć członka';
      setAlertModal({
        isOpen: true,
        title: 'Błąd',
        message: errorMessage,
        type: 'error',
      });
    } finally {
      setConfirmModal({ isOpen: false, userId: null, memberName: '' });
    }
  };


  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-600">Ładowanie członków zespołu...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Członkowie Zespołu</h2>
          <p className="text-gray-600 mt-1">
            Zarządzaj członkami zespołu, rolami i uprawnieniami dla tego projektu.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isOwnerOrAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#4E86D9] hover:bg-[#3d6bb8] rounded-md transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Dodaj Członka
            </button>
          )}
          {userRole !== 'owner' && (
            <button
              onClick={handleLeaveProjectClick}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
            >
              Opuść projekt
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {members.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Brak członków zespołu.</p>
            {isOwnerOrAdmin && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 text-[#4E86D9] hover:text-[#3d6bb8]"
              >
                Dodaj pierwszego członka zespołu
              </button>
            )}
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[#4E86D9] flex items-center justify-center text-white font-semibold">
                    {member.firstName?.charAt(0) || member.email?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {isOwnerOrAdmin ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4E86D9] focus:border-[#4E86D9]"
                      disabled={member.role === 'owner'}
                    >
                      <option value="owner">Właściciel</option>
                      <option value="admin">Administrator</option>
                      <option value="member">Członek</option>
                      <option value="observer">Obserwator</option>
                    </select>
                    {member.userId !== currentUser?.id && member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMemberClick(member.userId, `${member.firstName} ${member.lastName}`)}
                        className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                      >
                        Usuń
                      </button>
                    )}
                  </>
                ) : (
                  <RoleBadge role={member.role} />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative z-10 transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <form onSubmit={handleAddMember}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="w-full">
                    <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4" id="modal-title">
                      Dodaj Członka Zespołu
                    </h3>

                    {error && (
                      <div className="mb-4 rounded bg-red-50 border border-red-200 p-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    <div className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Adres e-mail <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4E86D9] focus:border-[#4E86D9] sm:text-sm"
                        placeholder="user@example.com"
                        disabled={adding}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Zaproszenie zostanie wysłane do tego użytkownika. Musi je zaakceptować, aby dołączyć do projektu.
                      </p>
                    </div>

                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                          Rola <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="role"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4E86D9] focus:border-[#4E86D9] sm:text-sm"
                          disabled={adding}
                        >
                          <option value="admin">Administrator</option>
                          <option value="member">Członek</option>
                          <option value="observer">Obserwator</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Administrator: Zarządzanie zespołem | Członek: Może tworzyć/edytować zadania | Obserwator: Tylko do odczytu
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="submit"
                    disabled={adding}
                    className="inline-flex w-full justify-center rounded-md bg-[#4E86D9] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#3d6bb8] focus:outline-none focus:ring-2 focus:ring-[#4E86D9] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto transition-colors"
                  >
                    {adding ? 'Dodawanie...' : 'Dodaj Członka'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEmail('');
                      setRole('member');
                      setError('');
                    }}
                    disabled={adding}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4E86D9] disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto transition-colors"
                  >
                    Anuluj
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Remove Member Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, userId: null, memberName: '', mode: 'remove' })}
        onConfirm={handleRemoveMember}
        title={confirmModal.mode === 'leave' ? 'Opuść projekt' : 'Usuń Członka Zespołu'}
        message={
          confirmModal.mode === 'leave'
            ? 'Czy na pewno chcesz opuścić ten projekt? Stracisz dostęp do wszystkich jego zasobów.'
            : `Czy na pewno chcesz usunąć ${confirmModal.memberName} z tego projektu? Tej akcji nie można cofnąć.`
        }
        confirmText={confirmModal.mode === 'leave' ? 'Opuść projekt' : 'Usuń'}
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

export default TeamManagement;

