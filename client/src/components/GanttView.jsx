import { useEffect, useRef, useState } from 'react';
import Gantt from 'frappe-gantt';
import '../styles/frappe-gantt.css';
import api from '../utils/api';
import ConfirmModal from './ConfirmModal';

const defaultFormState = {
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  progress: 0,
  status: 'planned',
  dependencies: '',
  backlogItemId: '',
};

const statusOptions = [
  { value: 'planned', label: 'Planowane' },
  { value: 'in_progress', label: 'W toku' },
  { value: 'blocked', label: 'Zablokowane' },
  { value: 'done', label: 'Zakończone' },
];

const GanttView = ({ projectId, userRole }) => {
  const [tasks, setTasks] = useState([]);
  const [backlogItems, setBacklogItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formState, setFormState] = useState(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const ganttContainerRef = useRef(null);
  const ganttInstanceRef = useRef(null);
  const canEdit = userRole !== 'observer';

  useEffect(() => {
    fetchTasks();
    fetchBacklogItems();
  }, [projectId]);

  useEffect(() => {
    renderGantt();
  }, [tasks]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/projects/${projectId}/gantt/tasks`);
      const formatted = (response.data.tasks || []).map((task) => ({
        ...task,
        startDate: task.start_date || task.startDate,
        endDate: task.end_date || task.endDate,
      }));
      setTasks(formatted);
    } catch (err) {
      console.error('Error fetching Gantt tasks:', err);
      setError('Nie udało się pobrać zadań Gantta.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBacklogItems = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/backlog`);
      setBacklogItems(response.data.items || []);
    } catch (err) {
      console.error('Error fetching backlog items:', err);
    }
  };

  const renderGantt = () => {
    if (!ganttContainerRef.current) {
      return;
    }

    ganttContainerRef.current.innerHTML = '';

    if (!tasks.length) {
      return;
    }

    const formattedTasks = tasks.map((task) => ({
      id: task.id.toString(),
      name: `#${task.id} - ${task.title}`,
      start: task.startDate,
      end: task.endDate,
      progress: task.progress || 0,
      dependencies: task.dependencies || '',
      custom_class: `gantt-${task.status}`,
    }));

    const minRows = 8;
    const placeholderCount = Math.max(0, minRows - formattedTasks.length);
    const today = new Date().toISOString().slice(0, 10);
    
    const placeholderTasks = Array.from({ length: placeholderCount }).map((_, index) => ({
      id: `placeholder-${index}`,
      name: '',
      start: today,
      end: today,
      progress: 0,
      dependencies: '',
      custom_class: 'gantt-placeholder',
    }));

    const allTasks = [...formattedTasks, ...placeholderTasks];

    ganttInstanceRef.current = new Gantt(ganttContainerRef.current, allTasks, {
      view_mode: 'Day',
      language: 'pl',
      custom_popup_html: (task) => {
        if (task.id.startsWith('placeholder-')) {
          return '';
        }
        const current = tasks.find((t) => t.id.toString() === task.id) || {};
        const linkedBacklog = current.backlog_item_id
          ? backlogItems.find((item) => item.id === current.backlog_item_id)
          : null;
        return `
          <div class="gantt-tooltip">
            <h4>${task.name}</h4>
            <p>${current.description || 'Brak opisu'}</p>
            <p><strong>Start:</strong> ${task.start}</p>
            <p><strong>Koniec:</strong> ${task.end}</p>
            <p><strong>Postęp:</strong> ${task.progress}%</p>
            <p><strong>Status:</strong> ${statusLabel(current.status)}</p>
            ${
              current.dependencies
                ? `<p><strong>Zależności:</strong> ${current.dependencies}</p>`
                : ''
            }
            ${
              linkedBacklog
                ? `<p><strong>Backlog:</strong> ${linkedBacklog.title}</p>`
                : ''
            }
          </div>
        `;
      },
    });
  };

  const statusLabel = (value) => {
    const option = statusOptions.find((opt) => opt.value === value);
    return option ? option.label : value;
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: name === 'progress' ? Number(value) : value,
    }));
  };

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingTaskId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canEdit) return;

    try {
      setIsSubmitting(true);
      setError('');

      const payload = {
        title: formState.title.trim(),
        description: formState.description?.trim() || '',
        startDate: formState.startDate,
        endDate: formState.endDate,
        progress: Number(formState.progress) || 0,
        status: formState.status,
        dependencies: formState.dependencies || '',
        backlogItemId: formState.backlogItemId ? Number(formState.backlogItemId) : null,
      };

      if (!payload.title || !payload.startDate || !payload.endDate) {
        setError('Uzupełnij wymagane pola.');
        setIsSubmitting(false);
        return;
      }

      if (payload.dependencies) {
        const dependencyIds = payload.dependencies
          .split(',')
          .map(id => id.trim())
          .filter(id => id !== '');
        
        const validTaskIds = tasks.map(t => t.id.toString());
        const currentTaskId = editingTaskId ? editingTaskId.toString() : null;
        
        const invalidIds = dependencyIds.filter(id => {
          if (id === currentTaskId) return true;
          return !validTaskIds.includes(id);
        });

        if (invalidIds.length > 0) {
          setError(`Nieprawidłowe ID zadań w zależnościach: ${invalidIds.join(', ')}. Dostępne ID: ${validTaskIds.join(', ') || 'brak'}`);
          setIsSubmitting(false);
          return;
        }
      }

      if (editingTaskId) {
        await api.put(`/projects/${projectId}/gantt/tasks/${editingTaskId}`, payload);
      } else {
        await api.post(`/projects/${projectId}/gantt/tasks`, payload);
      }

      await fetchTasks();
      resetForm();
    } catch (err) {
      console.error('Save Gantt task error:', err);
      const message = err.response?.data?.message || 'Nie udało się zapisać zadania.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (task) => {
    if (!canEdit) return;
    setEditingTaskId(task.id);
    setFormState({
      title: task.title,
      description: task.description || '',
      startDate: task.startDate?.slice(0, 10),
      endDate: task.endDate?.slice(0, 10),
      progress: task.progress || 0,
      status: task.status || 'planned',
      dependencies: task.dependencies || '',
      backlogItemId: task.backlog_item_id ? task.backlog_item_id.toString() : '',
    });
  };

  const confirmDelete = (task) => {
    if (!canEdit) return;
    setDeleteConfirm(task);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/projects/${projectId}/gantt/tasks/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      await fetchTasks();
    } catch (err) {
      console.error('Delete Gantt task error:', err);
      setError('Nie udało się usunąć zadania.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-surface rounded-xl border border-default p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-primary">Harmonogram projektu</h2>
            <p className="text-muted text-sm">Wizualizacja zadań i zależności w czasie</p>
          </div>
          <div className="text-sm text-muted">
            Tryb edycji: {canEdit ? 'włączony' : 'tylko podgląd'}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted">Ładowanie wykresu Gantta...</div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center text-muted">
            Brak zadań na wykresie. Dodaj pierwsze zadanie, aby rozpocząć planowanie.
          </div>
        ) : (
          <div className="overflow-auto">
            <div
              ref={ganttContainerRef}
              className="min-h-[420px]"
              style={{ minHeight: '420px' }}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-default p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">
              {editingTaskId ? 'Edytuj zadanie' : 'Dodaj zadanie'}
            </h3>
            {editingTaskId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-[#4E86D9] hover:text-[#3d6bb8]"
              >
                Anuluj edycję
              </button>
            )}
          </div>
          {!canEdit && (
            <p className="text-xs text-muted mb-4">
              Nie masz uprawnień do edycji. Skontaktuj się z właścicielem projektu.
            </p>
          )}
          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Tytuł <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formState.title}
                onChange={handleInputChange}
                disabled={!canEdit}
                className="w-full rounded-lg border border-default bg-transparent px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-[#4E86D9]"
                placeholder="Nazwa zadania"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Opis</label>
              <textarea
                name="description"
                value={formState.description}
                onChange={handleInputChange}
                disabled={!canEdit}
                className="w-full rounded-lg border border-default bg-transparent px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-[#4E86D9]"
                rows={3}
                placeholder="Szczegóły zadania"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Data startu <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formState.startDate}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-default bg-transparent px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-[#4E86D9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Data zakończenia <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formState.endDate}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-default bg-transparent px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-[#4E86D9]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Postęp (%)</label>
                <input
                  type="number"
                  name="progress"
                  value={formState.progress}
                  min={0}
                  max={100}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-default bg-transparent px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-[#4E86D9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Status</label>
                <select
                  name="status"
                  value={formState.status}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-default bg-transparent px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-[#4E86D9]"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-surface text-primary">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Zależności (ID po przecinku)</label>
              <input
                type="text"
                name="dependencies"
                value={formState.dependencies}
                onChange={handleInputChange}
                disabled={!canEdit}
                className="w-full rounded-lg border border-default bg-transparent px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-[#4E86D9]"
                placeholder="np. 1,2"
              />
              {tasks.length > 0 && (
                <p className="text-xs text-muted mt-1">
                  Dostępne ID zadań: {tasks
                    .filter(t => editingTaskId ? t.id !== editingTaskId : true)
                    .map(t => t.id)
                    .join(', ')}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Powiązany backlog</label>
              <select
                name="backlogItemId"
                value={formState.backlogItemId}
                onChange={handleInputChange}
                disabled={!canEdit}
                className="w-full rounded-lg border border-default bg-transparent px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-[#4E86D9]"
              >
                <option value="">Brak powiązania</option>
                {backlogItems.map((item) => (
                  <option key={item.id} value={item.id} className="bg-surface text-primary">
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={!canEdit || isSubmitting}
              className="w-full rounded-lg bg-[#4E86D9] py-2.5 text-white font-medium hover:bg-[#3d6bb8] transition disabled:opacity-50"
            >
              {editingTaskId ? 'Zapisz zmiany' : 'Dodaj zadanie'}
            </button>
          </form>
        </div>

        <div className="bg-surface rounded-xl border border-default p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-primary mb-4">Lista zadań</h3>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted">Brak zadań do wyświetlenia.</p>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-auto pr-1">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-default px-4 py-3 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-primary">
                      #{task.id} - {task.title}
                    </p>
                    <p className="text-xs text-muted">
                      {task.startDate?.slice(0, 10)} → {task.endDate?.slice(0, 10)}
                    </p>
                    <p className="text-xs text-muted">Postęp: {task.progress || 0}% | Status: {statusLabel(task.status)}</p>
                    {task.dependencies && (
                      <p className="text-xs text-muted">
                        Zależności: {task.dependencies}
                      </p>
                    )}
                    {task.backlog_item_id && (
                      <p className="text-xs text-muted">
                        Backlog: {backlogItems.find((item) => item.id === task.backlog_item_id)?.title || 'N/D'}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-2 ml-4">
                      <button
                        type="button"
                        onClick={() => startEdit(task)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Edytuj"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(task)}
                        className="text-gray-400 hover:text-red-600"
                        title="Usuń"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Usuń zadanie"
        message={`Czy na pewno chcesz usunąć zadanie "${deleteConfirm?.title}"? Tej operacji nie można cofnąć.`}
        confirmText="Usuń"
        cancelText="Anuluj"
        type="danger"
      />
    </div>
  );
};

export default GanttView;

