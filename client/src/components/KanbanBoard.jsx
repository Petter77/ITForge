import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import KanbanColumn from './KanbanColumn';
import TaskModal from './TaskModal';
import ColumnModal from './ColumnModal';
import AlertModal from './AlertModal';
import ConfirmModal from './ConfirmModal';

const KanbanBoard = ({ projectId, userRole }) => {
  const { user } = useAuth();
  const canEdit = userRole !== 'observer';
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTask, setActiveTask] = useState(null);
  const [taskModal, setTaskModal] = useState({ isOpen: false, task: null, columnId: null });
  const [columnModal, setColumnModal] = useState({ isOpen: false, column: null });
  const [members, setMembers] = useState([]);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [deleteColumnConfirm, setDeleteColumnConfirm] = useState({ isOpen: false, columnId: null, columnName: '' });
  const [overColumnId, setOverColumnId] = useState(null);
  
  // Track drag state to prevent click events during drag
  const isDragging = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
      enabled: canEdit, // Disable drag for observers
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      enabled: canEdit, // Disable drag for observers
    })
  );

  useEffect(() => {
    fetchKanbanData();
    fetchMembers();
  }, [projectId]);

  const fetchKanbanData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/projects/${projectId}/kanban`);
      setColumns(response.data.columns || []);
    } catch (err) {
      console.error('Error fetching kanban data:', err);
      setError('Nie udało się załadować tablicy Kanban');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/members`);
      setMembers(response.data.members || []);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const task = findTaskById(active.id);
    setActiveTask(task);
    isDragging.current = true;
    setOverColumnId(null);
  };

  const handleDragOver = (event) => {
    const { over } = event;
    if (!over) {
      setOverColumnId(null);
      return;
    }

    // Check if over a column drop zone
    const overId = over.id.toString();
    if (overId.startsWith('column-')) {
      const columnId = parseInt(overId.replace('column-', ''));
      setOverColumnId(columnId);
    } else {
      // Check if over a task - get its column
      const task = findTaskById(overId);
      if (task) {
        setOverColumnId(task.columnId);
      } else {
        setOverColumnId(null);
      }
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverColumnId(null);
    
    // Use setTimeout to ensure drag state is cleared after click handlers
    setTimeout(() => {
      isDragging.current = false;
    }, 100);

    // Observers cannot move tasks
    if (!canEdit) return;

    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Find the task and its current column
    const task = findTaskById(activeId);
    if (!task) return;

    let targetColumnId = null;
    let targetPosition = 0;

    // Check if dropped on a column drop zone
    if (overId.startsWith('column-')) {
      targetColumnId = parseInt(overId.replace('column-', ''));
      const targetTasks = getTasksForColumn(targetColumnId);
      targetPosition = targetTasks.length;
    } else {
      // Check if dropped on another task
      const targetTask = findTaskById(overId);
      if (targetTask && targetTask.columnId) {
        targetColumnId = targetTask.columnId;
        targetPosition = targetTask.position;
      } else {
        return;
      }
    }

    // Move task if column changed or position changed
    if (task.columnId !== targetColumnId || task.position !== targetPosition) {
      await moveTaskToColumn(task.id, targetColumnId, targetPosition);
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setOverColumnId(null);
    setTimeout(() => {
      isDragging.current = false;
    }, 100);
  };

  const findTaskById = (taskId) => {
    for (const column of columns) {
      const task = column.tasks?.find(t => t.id === parseInt(taskId));
      if (task) return task;
    }
    return null;
  };

  const getTasksForColumn = (columnId) => {
    const column = columns.find(col => col.id === columnId);
    return column?.tasks || [];
  };

  const moveTaskToColumn = async (taskId, columnId, position) => {
    try {
      await api.put(`/projects/${projectId}/kanban/tasks/${taskId}/move`, {
        columnId,
        position,
      });
      await fetchKanbanData();
    } catch (err) {
      console.error('Error moving task:', err);
      setAlertModal({
        isOpen: true,
        title: 'Błąd',
        message: err.response?.data?.message || 'Nie udało się przenieść zadania',
        type: 'error',
      });
    }
  };

  const handleTaskClick = (task) => {
    // Only open modal if we're not dragging
    if (!isDragging.current) {
      setTaskModal({ isOpen: true, task, columnId: task.columnId });
    }
  };

  const handleAddTask = (columnId) => {
    setTaskModal({ isOpen: true, task: null, columnId });
  };

  const handleTaskSave = () => {
    fetchKanbanData();
    setAlertModal({
      isOpen: true,
      title: 'Sukces',
      message: taskModal.task ? 'Zadanie zostało zaktualizowane' : 'Zadanie zostało utworzone',
      type: 'success',
    });
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/projects/${projectId}/kanban/tasks/${taskId}`);
      await fetchKanbanData();
      setAlertModal({
        isOpen: true,
        title: 'Sukces',
        message: 'Zadanie zostało usunięte pomyślnie',
        type: 'success',
      });
    } catch (err) {
      console.error('Error deleting task:', err);
      setAlertModal({
        isOpen: true,
        title: 'Błąd',
        message: err.response?.data?.message || 'Nie udało się usunąć zadania',
        type: 'error',
      });
    }
  };

  const handleColumnSave = () => {
    fetchKanbanData();
    setColumnModal({ isOpen: false, column: null });
    setAlertModal({
      isOpen: true,
      title: 'Sukces',
      message: columnModal.column ? 'Kolumna została zaktualizowana' : 'Kolumna została utworzona',
      type: 'success',
    });
  };

  const handleColumnDeleteClick = (columnId) => {
    const column = columns.find(col => col.id === columnId);
    if (column) {
      setDeleteColumnConfirm({
        isOpen: true,
        columnId: columnId,
        columnName: column.name,
      });
    }
  };

  const handleColumnDelete = async () => {
    if (!deleteColumnConfirm.columnId) return;

    try {
      await api.delete(`/projects/${projectId}/kanban/columns/${deleteColumnConfirm.columnId}`);
      await fetchKanbanData();
      setDeleteColumnConfirm({ isOpen: false, columnId: null, columnName: '' });
      setAlertModal({
        isOpen: true,
        title: 'Sukces',
        message: 'Kolumna została usunięta pomyślnie',
        type: 'success',
      });
    } catch (err) {
      console.error('Error deleting column:', err);
      setDeleteColumnConfirm({ isOpen: false, columnId: null, columnName: '' });
      setAlertModal({
        isOpen: true,
        title: 'Błąd',
        message: err.response?.data?.message || 'Nie udało się usunąć kolumny',
        type: 'error',
      });
    }
  };

  const closeTaskModal = () => {
    setTaskModal({ isOpen: false, task: null, columnId: null });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-600">Ładowanie tablicy Kanban...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  // Get all task IDs for sortable context
  const allTaskIds = columns.flatMap(col => (col.tasks || []).map(task => task.id.toString()));
  const columnIds = columns.map(col => col.id.toString());

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Tablica Kanban</h2>
          <p className="text-gray-600 mt-1">
            Zarządzaj zadaniami projektu. Przeciągaj i upuszczaj zadania między kolumnami.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setColumnModal({ isOpen: true, column: null })}
            disabled={columns.length >= 10}
            className="px-4 py-2 bg-[#4E86D9] text-white rounded-md hover:bg-[#3d6bb8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={columns.length >= 10 ? 'Maksymalna liczba kolumn (10) została osiągnięta' : 'Dodaj kolumnę'}
          >
            + Dodaj kolumnę
          </button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-4">
            {columns.map((column) => {
              const taskIds = (column.tasks || []).map(task => task.id.toString());
              return (
                <SortableContext
                  key={column.id}
                  items={taskIds}
                  strategy={verticalListSortingStrategy}
                >
                  <KanbanColumn
                    column={column}
                    tasks={column.tasks || []}
                    onTaskClick={handleTaskClick}
                    onAddTask={() => handleAddTask(column.id)}
                    onEdit={(col) => setColumnModal({ isOpen: true, column: col })}
                    onDelete={handleColumnDeleteClick}
                    isOver={overColumnId === column.id}
                    canEdit={canEdit}
                  />
                </SortableContext>
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeTask ? (
            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 w-64">
              <h4 className="font-semibold text-gray-900 mb-1">{activeTask.title}</h4>
              {activeTask.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{activeTask.description}</p>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Modal */}
      {taskModal.isOpen && (
        <TaskModal
          isOpen={taskModal.isOpen}
          onClose={closeTaskModal}
          task={taskModal.task}
          columnId={taskModal.columnId}
          columns={columns}
          members={members}
          projectId={projectId}
          onSave={canEdit ? handleTaskSave : null}
          onDelete={canEdit ? handleDeleteTask : null}
          readOnly={!canEdit}
        />
      )}

      {/* Column Modal */}
      {columnModal.isOpen && (
        <ColumnModal
          isOpen={columnModal.isOpen}
          onClose={() => setColumnModal({ isOpen: false, column: null })}
          column={columnModal.column}
          projectId={projectId}
          onSave={handleColumnSave}
          onDelete={canEdit ? handleColumnDelete : null}
        />
      )}

      {/* Delete Column Confirmation */}
      <ConfirmModal
        isOpen={deleteColumnConfirm.isOpen}
        onClose={() => setDeleteColumnConfirm({ isOpen: false, columnId: null, columnName: '' })}
        onConfirm={handleColumnDelete}
        title="Usuń kolumnę"
        message={`Czy na pewno chcesz usunąć kolumnę "${deleteColumnConfirm.columnName}"? Tej akcji nie można cofnąć. Upewnij się, że kolumna nie zawiera zadań.`}
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

export default KanbanBoard;

