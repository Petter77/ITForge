import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const TeamManagement = ({ projectId, userRole }) => {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [adding, setAdding] = useState(false);

  const isOwner = userRole === 'owner';

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
      setError('Failed to load team members');
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
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to add member';
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
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update role';
      setError(errorMessage);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member from the project?')) {
      return;
    }

    try {
      const response = await api.delete(`/projects/${projectId}/members/${userId}`);
      setMembers(response.data.members);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to remove member';
      setError(errorMessage);
    }
  };

  const formatRole = (role) => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700';
      case 'member':
        return 'bg-blue-100 text-blue-700';
      case 'observer':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-600">Loading team members...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Team Members</h2>
          <p className="text-gray-600 mt-1">
            Manage team members, roles, and permissions for this project.
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#4E86D9] hover:bg-[#3d6bb8] rounded-md transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Member
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {members.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No team members yet.</p>
            {isOwner && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 text-[#4E86D9] hover:text-[#3d6bb8]"
              >
                Add your first team member
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
                {isOwner ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4E86D9] focus:border-[#4E86D9]"
                      disabled={member.userId === currentUser?.id && member.role === 'owner'}
                    >
                      <option value="owner">Owner</option>
                      <option value="member">Member</option>
                      <option value="observer">Observer</option>
                    </select>
                    {member.userId !== currentUser?.id && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                        disabled={member.role === 'owner' && members.filter(m => m.role === 'owner').length === 1}
                      >
                        Remove
                      </button>
                    )}
                  </>
                ) : (
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(member.role)}`}>
                    {formatRole(member.role)}
                  </span>
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
                      Add Team Member
                    </h3>

                    {error && (
                      <div className="mb-4 rounded bg-red-50 border border-red-200 p-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address <span className="text-red-500">*</span>
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
                        <p className="mt-1 text-xs text-gray-500">User must be registered in the system</p>
                      </div>

                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                          Role <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="role"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4E86D9] focus:border-[#4E86D9] sm:text-sm"
                          disabled={adding}
                        >
                          <option value="member">Member</option>
                          <option value="observer">Observer</option>
                          <option value="owner">Owner</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Owner: Full access | Member: Can create/edit tasks | Observer: Read-only
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
                    {adding ? 'Adding...' : 'Add Member'}
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
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;

