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
      <div className="min-h-screen bg-gradient-dark bg-grid flex items-center justify-center">
        <div className="text-slate-400 flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark bg-grid">
      {/* Header */}
      <header className="glass border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-xl animate-float">
                🌿
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100 text-glow-cyan">Sage Tasks</h1>
                <p className="text-xs text-slate-500">Project Management</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3">
              <div className="glass-card px-4 py-2 rounded-lg flex items-center gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-100">{totalTasks}</div>
                  <div className="text-xs text-slate-500">Total</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-400">{sageTaskCount}</div>
                  <div className="text-xs text-slate-500">🌿 Sage</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <div className="text-lg font-bold text-cyan-400">{cliftonTaskCount}</div>
                  <div className="text-xs text-slate-500">👤 Clifton</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">{completedCount}</div>
                  <div className="text-xs text-slate-500">✅ Done</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="input-dark text-sm"
              >
                <option value="all">All Tasks</option>
                <option value="sage">🌿 Sage Tasks</option>
                <option value="clifton">👤 Clifton Tasks</option>
              </select>

              {/* New Task Button */}
              <button
                onClick={() => handleAddTask('todo')}
                className="btn-primary flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Task</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="p-6 overflow-x-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-5 min-w-max pb-4">
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
  );
}
