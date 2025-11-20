import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanTask from './KanbanTask';

const KanbanColumn = ({ column, tasks, onTaskClick, onAddTask, onEdit, onDelete, isOver, canEdit = true }) => {
  const taskIds = tasks.map(task => task.id);

  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: `column-${column.id}`,
  });

  const isActive = isOver || isDroppableOver;

  return (
    <div
      ref={setNodeRef}
      className={`w-full bg-gray-50 rounded-lg p-4 border-2 transition-colors flex flex-col ${
        isActive
          ? 'border-[#4E86D9] bg-blue-50'
          : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{column.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
            {tasks.length}
          </span>
          {canEdit && (
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit(column);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
                title="Edytuj kolumnę"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete(column.id);
                }}
                className="text-gray-400 hover:text-red-600 p-1"
                title="Usuń kolumnę"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className={`flex-1 min-h-[100px] space-y-2 transition-all ${isActive ? 'py-2' : ''}`}>
          {tasks.length === 0 && isActive && (
            <div className="text-center text-gray-400 text-sm py-8 border-2 border-dashed border-[#4E86D9] rounded-lg">
              Upuść zadanie tutaj
            </div>
          )}
          {tasks.map((task) => (
            <KanbanTask
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              canEdit={canEdit}
            />
          ))}
        </div>
      </SortableContext>

      {canEdit && (
        <button
          onClick={onAddTask}
          className="w-full mt-auto py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors border border-dashed border-gray-300"
        >
          + Dodaj zadanie
        </button>
      )}
    </div>
  );
};

export default KanbanColumn;

