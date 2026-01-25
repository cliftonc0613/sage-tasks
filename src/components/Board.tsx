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
      // Moving within same column
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
      // Moving between columns
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
      // Editing existing task
      setBoard({
        ...board,
        tasks: {
          ...board.tasks,
          [taskData.id]: {
            ...board.tasks[taskData.id],
            ...taskData,
          },
        },
      });
    } else {
      // Creating new task
      const newTask = createTask(
        taskData.title,
        taskData.description,
        taskData.assignee,
        taskData.priority,
        taskData.project,
        taskData.dueDate
      );

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

  const sageTaskCount = Object.values(board.tasks).filter(t => t.assignee === 'sage').length;
  const cliftonTaskCount = Object.values(board.tasks).filter(t => t.assignee === 'clifton').length;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌿</span>
              <h1 className="text-xl font-bold text-gray-900">Sage Tasks</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Stats */}
              <div className="flex gap-3 text-sm">
                <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                  🌿 Sage: {sageTaskCount}
                </span>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  👤 Clifton: {cliftonTaskCount}
                </span>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Filter:</span>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                  className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Tasks</option>
                  <option value="sage">🌿 Sage&apos;s Tasks</option>
                  <option value="clifton">👤 Clifton&apos;s Tasks</option>
                </select>
              </div>

              {/* New Task Button */}
              <button
                onClick={() => handleAddTask('todo')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <span>➕</span>
                <span>New Task</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="p-4 overflow-x-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-w-max">
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
