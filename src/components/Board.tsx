'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { BoardState, Task } from '@/types';
import { loadBoard, saveBoard, createTask, initialState } from '@/lib/store';
import { Column } from './Column';
import { TaskModal } from './TaskModal';

export function Board() {
  const [board, setBoard] = useState<BoardState>(initialState);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [targetColumn, setTargetColumn] = useState<string>('todo');
  const [filter, setFilter] = useState<'all' | 'clifton' | 'sage'>('all');
  const [activeView, setActiveView] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBoard(loadBoard());
  }, []);

  useEffect(() => {
    if (mounted) {
      saveBoard(board);
    }
  }, [board, mounted]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    const sourceColumn = board.columns[source.droppableId];
    const destColumn = board.columns[destination.droppableId];

    if (sourceColumn.id === destColumn.id) {
      const newTaskIds = Array.from(sourceColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      setBoard({
        ...board,
        columns: {
          ...board.columns,
          [sourceColumn.id]: { ...sourceColumn, taskIds: newTaskIds },
        },
      });
    } else {
      const sourceTaskIds = Array.from(sourceColumn.taskIds);
      sourceTaskIds.splice(source.index, 1);
      
      const destTaskIds = Array.from(destColumn.taskIds);
      destTaskIds.splice(destination.index, 0, draggableId);

      setBoard({
        ...board,
        columns: {
          ...board.columns,
          [sourceColumn.id]: { ...sourceColumn, taskIds: sourceTaskIds },
          [destColumn.id]: { ...destColumn, taskIds: destTaskIds },
        },
      });
    }
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

  const handleDeleteTask = (taskId: string) => {
    if (!confirm('Delete this task?')) return;

    const newTasks = { ...board.tasks };
    delete newTasks[taskId];

    const newColumns = { ...board.columns };
    for (const colId of Object.keys(newColumns)) {
      newColumns[colId] = {
        ...newColumns[colId],
        taskIds: newColumns[colId].taskIds.filter((id) => id !== taskId),
      };
    }

    setBoard({ ...board, tasks: newTasks, columns: newColumns });
  };

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'createdAt'> & { id?: string }) => {
    if (taskData.id) {
      setBoard({
        ...board,
        tasks: {
          ...board.tasks,
          [taskData.id]: {
            ...board.tasks[taskData.id],
            ...taskData,
            updatedAt: new Date().toISOString(),
          },
        },
      });
    } else {
      const newTask = createTask(
        taskData.title,
        taskData.description,
        taskData.assignee,
        taskData.priority,
        taskData.project,
        taskData.dueDate
      );
      newTask.subtasks = taskData.subtasks || [];
      newTask.comments = taskData.comments || [];

      setBoard({
        ...board,
        tasks: { ...board.tasks, [newTask.id]: newTask },
        columns: {
          ...board.columns,
          [targetColumn]: {
            ...board.columns[targetColumn],
            taskIds: [...board.columns[targetColumn].taskIds, newTask.id],
          },
        },
      });
    }
  };

  const getFilteredTasks = (taskIds: string[]) => {
    return taskIds
      .map((id) => board.tasks[id])
      .filter((task) => {
        if (!task) return false;
        if (filter === 'all') return true;
        return task.assignee === filter;
      });
  };

  const totalTasks = Object.keys(board.tasks).length;
  const sageTaskCount = Object.values(board.tasks).filter(t => t.assignee === 'sage').length;
  const cliftonTaskCount = Object.values(board.tasks).filter(t => t.assignee === 'clifton').length;
  const completedCount = board.columns['done']?.taskIds.length || 0;

  if (!mounted) {
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
              {board.columnOrder.map((columnId) => {
                const column = board.columns[columnId];
                const tasks = getFilteredTasks(column.taskIds);

                return (
                  <Column
                    key={column.id}
                    column={column}
                    tasks={tasks}
                    onAddTask={handleAddTask}
                    onEditTask={handleEditTask}
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
          task={editingTask}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask}
        />
      </div>
    </div>
  );
}
