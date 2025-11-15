import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const KanbanTask = ({ task, onClick, canEdit = true }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canEdit ? { ...attributes, ...listeners } : {})}
      onClick={onClick}
      className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow mb-2 ${
        canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      }`}
    >
      <h4 className="font-semibold text-gray-900 mb-1 text-sm">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-2">{task.description}</p>
      )}
      {task.assignedTo && task.assignedTo.length > 0 && (
        <div className="mt-2 space-y-1">
          {Array.isArray(task.assignedTo) ? (
            <>
              {task.assignedTo.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-[#4E86D9] flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                    {user.firstName?.[0] || user.email?.[0] || '?'}
                  </div>
                  <span className="text-xs text-gray-700 truncate">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
              ))}
            </>
          ) : (
            // Backward compatibility for single assignee
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#4E86D9] flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {task.assignedTo.firstName?.[0] || task.assignedTo.email?.[0] || '?'}
              </div>
              <span className="text-xs text-gray-700 truncate">
                {task.assignedTo.firstName} {task.assignedTo.lastName}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KanbanTask;

