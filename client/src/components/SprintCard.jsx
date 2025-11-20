const SprintCard = ({ sprint, onEdit, onDelete, canEdit = true }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-300';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
      case 'planned': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Aktywny';
      case 'completed': return 'Zakończony';
      case 'cancelled': return 'Anulowany';
      case 'planned': return 'Zaplanowany';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor(sprint.status)}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{sprint.name}</h4>
          {sprint.goal && (
            <p className="text-sm text-gray-600 mb-2">{sprint.goal}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            {sprint.start_date && (
              <span>Od: {formatDate(sprint.start_date)}</span>
            )}
            {sprint.end_date && (
              <span>Do: {formatDate(sprint.end_date)}</span>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={onEdit}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(sprint.id);
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
      <div className="mt-2">
        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(sprint.status)}`}>
          {getStatusText(sprint.status)}
        </span>
      </div>
    </div>
  );
};

export default SprintCard;

