const BacklogItemCard = ({ item, sprints, onEdit, onDelete, onMoveToSprint, canEdit = true }) => {
  const getTypeColor = (type) => {
    switch (type) {
      case 'story': return 'bg-blue-100 text-blue-700';
      case 'bug': return 'bg-red-100 text-red-700';
      case 'task': return 'bg-green-100 text-green-700';
      case 'epic': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
      case 'done': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'todo': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div
      className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
        canEdit ? 'cursor-pointer' : ''
      }`}
      onClick={canEdit ? onEdit : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(item.type)}`}>
              {item.type === 'story' ? 'User Story' : item.type === 'bug' ? 'Bug' : item.type === 'task' ? 'Task' : 'Epic'}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(item.status)}`}>
              {item.status === 'todo' ? 'Do zrobienia' : item.status === 'in_progress' ? 'W trakcie' : 'Zrobione'}
            </span>
            {item.story_points && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-700">
                {item.story_points} SP
              </span>
            )}
            <div className={`w-2 h-2 rounded-full ${getPriorityColor(item.priority)}`} title={item.priority} />
          </div>
          <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
          {item.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.description}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="text-gray-400 hover:text-red-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {item.assignedTo && item.assignedTo.length > 0 && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-500">Przypisane do:</span>
          {item.assignedTo.map((user) => (
            <div key={user.id} className="flex items-center gap-1">
              <div className="w-6 h-6 rounded-full bg-[#4E86D9] flex items-center justify-center text-white text-xs font-medium">
                {user.firstName?.[0] || user.email?.[0] || '?'}
              </div>
              <span className="text-xs text-gray-700">
                {user.firstName} {user.lastName}
              </span>
            </div>
          ))}
        </div>
      )}

      {item.sprint_id && (
        <div className="mt-2 text-xs text-gray-500">
          Sprint: {sprints.find(s => s.id === item.sprint_id)?.name || 'Nieznany'}
        </div>
      )}
    </div>
  );
};

export default BacklogItemCard;

