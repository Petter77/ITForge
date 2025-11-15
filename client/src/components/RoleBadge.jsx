const RoleBadge = ({ role, className = '' }) => {
  const formatRole = (role) => {
    if (!role) return '';
    const roleMap = {
      'owner': 'Właściciel',
      'admin': 'Administrator',
      'member': 'Członek',
      'observer': 'Obserwator'
    };
    return roleMap[role.toLowerCase()] || role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  const getRoleBadgeColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'owner':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-indigo-100 text-indigo-700';
      case 'member':
        return 'bg-blue-100 text-blue-700';
      case 'observer':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (!role) return null;

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(role)} ${className}`}>
      {formatRole(role)}
    </span>
  );
};

export default RoleBadge;

