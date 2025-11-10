import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import AlertModal from './AlertModal';

const Notifications = () => {
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  const fetchInvitations = useCallback(async () => {
    try {
      const response = await api.get('/invitations');
      setInvitations(response.data.invitations || []);
    } catch (err) {
      console.error('Error fetching invitations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
    // Refresh invitations every 30 seconds
    const interval = setInterval(fetchInvitations, 30000);
    return () => clearInterval(interval);
  }, [fetchInvitations]);

  const handleAccept = async (invitationId) => {
    try {
      const response = await api.post(`/invitations/${invitationId}/accept`);
      // Refresh invitations list
      await fetchInvitations();
      // Optionally navigate to the project
      if (response.data.projectId) {
        navigate(`/projects/${response.data.projectId}`);
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setAlertModal({
        isOpen: true,
        title: 'Błąd',
        message: err.response?.data?.message || 'Nie udało się zaakceptować zaproszenia',
        type: 'error',
      });
    }
  };

  const handleReject = async (invitationId) => {
    try {
      await api.post(`/invitations/${invitationId}/reject`);
      // Refresh invitations list
      await fetchInvitations();
    } catch (err) {
      console.error('Error rejecting invitation:', err);
      setAlertModal({
        isOpen: true,
        title: 'Błąd',
        message: err.response?.data?.message || 'Nie udało się odrzucić zaproszenia',
        type: 'error',
      });
    }
  };

  const unreadCount = invitations.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-black"></span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Powiadomienia</h3>
            </div>

            {loading ? (
              <div className="p-4 text-center text-gray-500">Ładowanie...</div>
            ) : invitations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p>Brak powiadomień</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {invitation.inviter.firstName} {invitation.inviter.lastName}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          zaprosił Cię do dołączenia do <span className="font-medium">{invitation.project.name}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Rola: {invitation.role === 'owner' ? 'Właściciel' : invitation.role === 'admin' ? 'Administrator' : invitation.role === 'member' ? 'Członek' : 'Obserwator'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={() => handleAccept(invitation.id)}
                        className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-[#4E86D9] hover:bg-[#3d6bb8] rounded-md transition-colors"
                      >
                        Akceptuj
                      </button>
                      <button
                        onClick={() => handleReject(invitation.id)}
                        className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        Odrzuć
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

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

export default Notifications;

