'use client';

import { useState, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Column } from './Column';
import { TaskModal } from './TaskModal';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { MobileHeader } from './MobileHeader';
import { CommandPalette, useCommandPalette } from './CommandPalette';
import { ActivityLog } from './ActivityLog';
import { TemplatePicker } from './TemplatePicker';

// Export tasks to CSV
function exportToCSV(tasks: Task[]) {
  const headers = ['Title', 'Description', 'Status', 'Priority', 'Assignee', 'Project', 'Due Date', 'Time Estimate (mins)', 'Subtasks', 'Created At'];
  const rows = tasks.map(t => [
    t.title,
    t.description.replace(/"/g, '""'),
    t.status,
    t.priority,
    t.assignee,
    t.project || '',
    t.dueDate || '',
    t.timeEstimate || '',
    t.subtasks.map(s => `${s.completed ? '✓' : '○'} ${s.title}`).join('; '),
    t.createdAt,
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `sage-tasks-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

type Task = {
  _id: Id<"tasks">;
  title: string;
  description: string;
  assignee: "clifton" | "sage" | "unassigned";
  priority: "low" | "medium" | "high";
  status: "backlog" | "todo" | "in-progress" | "review" | "done";
  project?: string;
  dueDate?: string;
  timeEstimate?: number;
  subtasks: { id: string; title: string; completed: boolean }[];
  comments: { id: string; author: "clifton" | "sage" | "system"; content: string; createdAt: string }[];
  recurring?: { frequency: "daily" | "weekly" | "monthly"; interval: number };
  order: number;
  createdAt: string;
  updatedAt?: string;
};

const columns = [
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
] as const;

export function Board() {
  const tasks = useQuery(api.tasks.list);
  const stats = useQuery(api.tasks.stats);
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const moveTask = useMutation(api.tasks.move);
  const deleteTask = useMutation(api.tasks.remove);
  const bulkUpdateTasks = useMutation(api.tasks.bulkUpdate);
  const bulkDeleteTasks = useMutation(api.tasks.bulkDelete);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [targetColumn, setTargetColumn] = useState<string>('todo');
  const [filter, setFilter] = useState<'all' | 'clifton' | 'sage'>('all');
  const [showActivity, setShowActivity] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const router = useRouter();
  const { isOpen: commandOpen, setIsOpen: setCommandOpen } = useCommandPalette();
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // Bulk selection handlers
  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTasks(new Set());
    setSelectMode(false);
  }, []);

  const handleBulkMove = async (newStatus: Task['status']) => {
    const ids = Array.from(selectedTasks) as Id<"tasks">[];
    await bulkUpdateTasks({ ids, status: newStatus });
    clearSelection();
  };

  const handleBulkAssign = async (assignee: Task['assignee']) => {
    const ids = Array.from(selectedTasks) as Id<"tasks">[];
    await bulkUpdateTasks({ ids, assignee });
    clearSelection();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTasks.size} tasks?`)) return;
    const ids = Array.from(selectedTasks) as Id<"tasks">[];
    await bulkDeleteTasks({ ids });
    clearSelection();
  };

  const handleExport = () => {
    if (tasks) {
      exportToCSV(tasks);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    await moveTask({
      id: draggableId as Id<"tasks">,
      newStatus: destination.droppableId as Task['status'],
      newOrder: destination.index,
    });
  };

  const handleAddTask = (columnId: string) => {
    setTargetColumn(columnId);
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    await deleteTask({ id: taskId as Id<"tasks"> });
  };

  const handleSaveTask = async (taskData: {
    id?: string;
    title: string;
    description: string;
    assignee: "clifton" | "sage" | "unassigned";
    priority: "low" | "medium" | "high";
    project?: string;
    dueDate?: string;
    timeEstimate?: number;
    subtasks: { id: string; title: string; completed: boolean }[];
    comments: { id: string; author: "clifton" | "sage" | "system"; content: string; createdAt: string }[];
    recurring?: { frequency: "daily" | "weekly" | "monthly"; interval: number };
  }) => {
    if (taskData.id) {
      await updateTask({
        id: taskData.id as Id<"tasks">,
        title: taskData.title,
        description: taskData.description,
        assignee: taskData.assignee,
        priority: taskData.priority,
        project: taskData.project,
        dueDate: taskData.dueDate,
        timeEstimate: taskData.timeEstimate,
        subtasks: taskData.subtasks,
        comments: taskData.comments,
        recurring: taskData.recurring,
      });
    } else {
      await createTask({
        title: taskData.title,
        description: taskData.description,
        assignee: taskData.assignee,
        priority: taskData.priority,
        status: targetColumn as Task['status'],
        project: taskData.project,
        dueDate: taskData.dueDate,
        timeEstimate: taskData.timeEstimate,
        subtasks: taskData.subtasks,
        comments: taskData.comments,
        recurring: taskData.recurring,
      });
    }
  };

  const getTasksForColumn = (columnId: string) => {
    if (!tasks) return [];
    return tasks
      .filter((task) => task.status === columnId)
      .filter((task) => {
        if (filter === 'all') return true;
        return task.assignee === filter;
      })
      .sort((a, b) => a.order - b.order);
  };

  const totalTasks = tasks?.length || 0;
  const sageTaskCount = tasks?.filter(t => t.assignee === 'sage').length || 0;
  const cliftonTaskCount = tasks?.filter(t => t.assignee === 'clifton').length || 0;
  const completedCount = tasks?.filter(t => t.status === 'done').length || 0;
  const overdueCount = stats?.overdue || 0;

  if (tasks === undefined) {
    return (
      <div className="app-container">
        <Sidebar activePage="board" />
        <div className="main-content">
          <div className="loading">
            <div className="loading-spinner" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <MobileHeader title="Board" onOpenCommandPalette={() => setCommandOpen(true)} />
      <Sidebar activePage="board" />
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-top">
            {/* Logo & Title */}
            <div className="header-title">
              <div className="logo">🌿</div>
              <div>
                <h1>Sage Tasks</h1>
                <p className="header-subtitle">Project Management</p>
              </div>
            </div>

            {/* Actions */}
            <div className="header-actions">
              <button
                onClick={() => setSelectMode(!selectMode)}
                className={`btn btn-ghost btn-icon ${selectMode ? 'active' : ''}`}
                title="Multi-select mode"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </button>

              <button
                onClick={handleExport}
                className="btn btn-ghost btn-icon"
                title="Export to CSV"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>

              <button
                onClick={() => setShowActivity(!showActivity)}
                className={`btn btn-ghost btn-icon ${showActivity ? 'active' : ''}`}
                title="Activity Log"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="filter-select"
              >
                <option value="all">All Tasks</option>
                <option value="sage">🌿 Sage</option>
                <option value="clifton">👤 Clifton</option>
              </select>

              <button
                onClick={() => setTemplatePickerOpen(true)}
                className="btn btn-ghost"
                title="Create from template"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Template
              </button>

              <button
                onClick={() => setCommandOpen(true)}
                className="btn btn-primary"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Task
                <span className="shortcut-badge">⌘K</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="stats-bar">
            <div className="stat-item">
              <div className="stat-value">{totalTasks}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value" style={{ color: 'var(--status-complete)' }}>{sageTaskCount}</div>
              <div className="stat-label">🌿 Sage</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#3b82f6' }}>{cliftonTaskCount}</div>
              <div className="stat-label">👤 Clifton</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value" style={{ color: 'var(--status-complete)' }}>{completedCount}</div>
              <div className="stat-label">✅ Done</div>
            </div>
            {overdueCount > 0 && (
              <>
                <div className="stat-divider" />
                <div className="stat-item">
                  <div className="stat-value" style={{ color: 'var(--status-high)' }}>{overdueCount}</div>
                  <div className="stat-label">⚠️ Overdue</div>
                </div>
              </>
            )}
          </div>

          {/* View Tabs */}
          <div className="nav-tabs">
            <button className="nav-tab active">
              Kanban
            </button>
            <button
              className="nav-tab"
              onClick={() => router.push('/list')}
            >
              List
            </button>
            <button
              className="nav-tab"
              onClick={() => router.push('/calendar')}
            >
              Calendar
            </button>
            <button
              className="nav-tab"
              onClick={() => router.push('/dashboard')}
            >
              Dashboard
            </button>
          </div>
        </header>

        {/* Bulk Actions Bar */}
        {selectedTasks.size > 0 && (
          <div className="bulk-actions-bar">
            <div className="bulk-count">
              <span>{selectedTasks.size} selected</span>
              <button onClick={clearSelection} className="btn btn-ghost btn-sm">
                Clear
              </button>
            </div>
            <div className="bulk-buttons">
              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkMove(e.target.value as Task['status']);
                  e.target.value = '';
                }}
                className="bulk-select"
                defaultValue=""
              >
                <option value="" disabled>Move to...</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkAssign(e.target.value as Task['assignee']);
                  e.target.value = '';
                }}
                className="bulk-select"
                defaultValue=""
              >
                <option value="" disabled>Assign to...</option>
                <option value="clifton">👤 Clifton</option>
                <option value="sage">🌿 Sage</option>
                <option value="unassigned">Unassigned</option>
              </select>
              <button onClick={handleBulkDelete} className="btn btn-danger btn-sm">
                🗑️ Delete
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="board-container">
          {/* Board */}
          <main className={`board ${showActivity ? 'with-activity' : ''}`}>
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="board-columns">
                {columns.map((column) => {
                  const columnTasks = getTasksForColumn(column.id);

                  return (
                    <Column
                      key={column.id}
                      column={{ id: column.id, title: column.title, taskIds: [] }}
                      tasks={columnTasks as any}
                      onAddTask={handleAddTask}
                      onEditTask={handleEditTask as any}
                      onDeleteTask={handleDeleteTask}
                      selectMode={selectMode}
                      selectedTasks={selectedTasks}
                      onToggleSelect={toggleTaskSelection}
                    />
                  );
                })}
              </div>
            </DragDropContext>
          </main>

          {/* Activity Panel */}
          {showActivity && (
            <aside className="activity-panel">
              <div className="activity-panel-header">
                <h3>Recent Activity</h3>
                <button
                  onClick={() => setShowActivity(false)}
                  className="btn btn-ghost btn-icon"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ActivityLog limit={15} />
            </aside>
          )}
        </div>

        {/* Modal */}
        <TaskModal
          isOpen={isModalOpen}
          task={editingTask as any}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask as any}
        />

        {/* Command Palette */}
        <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />

        {/* Template Picker */}
        <TemplatePicker isOpen={templatePickerOpen} onClose={() => setTemplatePickerOpen(false)} />
      </div>
      <BottomNav />
    </div>
  );
}
