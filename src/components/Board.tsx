'use client';

import { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Column } from './Column';
import { TaskModal } from './TaskModal';

type Task = {
  _id: Id<"tasks">;
  title: string;
  description: string;
  assignee: "clifton" | "sage" | "unassigned";
  priority: "low" | "medium" | "high";
  status: "backlog" | "todo" | "in-progress" | "review" | "done";
  project?: string;
  dueDate?: string;
  subtasks: { id: string; title: string; completed: boolean }[];
  comments: { id: string; author: "clifton" | "sage" | "system"; content: string; createdAt: string }[];
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
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const moveTask = useMutation(api.tasks.move);
  const deleteTask = useMutation(api.tasks.remove);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [targetColumn, setTargetColumn] = useState<string>('todo');
  const [filter, setFilter] = useState<'all' | 'clifton' | 'sage'>('all');
  const [activeView, setActiveView] = useState<'kanban' | 'list' | 'calendar'>('kanban');

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
    subtasks: { id: string; title: string; completed: boolean }[];
    comments: { id: string; author: "clifton" | "sage" | "system"; content: string; createdAt: string }[];
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
        subtasks: taskData.subtasks,
        comments: taskData.comments,
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
        subtasks: taskData.subtasks,
        comments: taskData.comments,
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

  if (tasks === undefined) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="app-container">
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
                onClick={() => handleAddTask('todo')}
                className="btn btn-primary"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Task
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
          </div>

          {/* View Tabs */}
          <div className="nav-tabs">
            <button
              className={`nav-tab ${activeView === 'kanban' ? 'active' : ''}`}
              onClick={() => setActiveView('kanban')}
            >
              Kanban
            </button>
            <button
              className={`nav-tab ${activeView === 'list' ? 'active' : ''}`}
              onClick={() => setActiveView('list')}
            >
              List
            </button>
            <button
              className={`nav-tab ${activeView === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveView('calendar')}
            >
              Calendar
            </button>
          </div>
        </header>

        {/* Board */}
        <main className="board">
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
                  />
                );
              })}
            </div>
          </DragDropContext>
        </main>

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
      </div>
    </div>
  );
}
