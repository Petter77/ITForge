import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanTask from './KanbanTask';

const KanbanColumn = ({ column, tasks, onTaskClick, onAddTask, isOver, canEdit = true }) => {
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
        <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
          {tasks.length}
        </span>
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

