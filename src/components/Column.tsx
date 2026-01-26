'use client';

import { Droppable } from '@hello-pangea/dnd';
import { TaskCard } from './TaskCard';

interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

interface Task {
  _id: string;
  title: string;
  description: string;
  assignee: "clifton" | "sage" | "unassigned";
  priority: "low" | "medium" | "high";
  status: string;
  project?: string;
  dueDate?: string;
  subtasks: { id: string; title: string; completed: boolean }[];
  comments: { id: string; author: "clifton" | "sage" | "system"; content: string; createdAt: string }[];
  order: number;
  createdAt: string;
}

interface ColumnProps {
  column: Column;
  tasks: Task[];
  allTasks?: { _id: string; status: string }[];
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  selectMode?: boolean;
  selectedTasks?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
}

const columnConfig: Record<string, { icon: string; colorClass: string }> = {
  'backlog': { icon: '📋', colorClass: 'backlog' },
  'todo': { icon: '', colorClass: 'todo' },
  'in-progress': { icon: '', colorClass: 'in-progress' },
  'review': { icon: '', colorClass: 'review' },
  'done': { icon: '', colorClass: 'done' },
};

export function Column({ column, tasks, allTasks = [], onAddTask, onEditTask, onDeleteTask, selectMode, selectedTasks, onToggleSelect }: ColumnProps) {
  const config = columnConfig[column.id] || { icon: '', colorClass: 'todo' };

  return (
    <div className="column">
      {/* Column Header */}
      <div className="column-header">
        <div className="column-title">
          <div className={`column-icon ${config.colorClass}`} />
          <h3>{column.title}</h3>
          <span className="column-count">{tasks.length}</span>
        </div>
        <button
          onClick={() => onAddTask(column.id)}
          className="btn btn-ghost btn-icon"
          title="Add task"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      
      {/* Droppable Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-content ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="column-empty">
                <div className="column-empty-icon">
                  {column.id === 'done' ? '🎉' : '📝'}
                </div>
                <span>No tasks</span>
              </div>
            )}
            {tasks.map((task, index) => (
              <TaskCard
                key={task._id}
                task={task}
                index={index}
                allTasks={allTasks}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                selectMode={selectMode}
                isSelected={selectedTasks?.has(task._id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Column Footer - Add Task */}
      <div className="column-footer">
        <button
          onClick={() => onAddTask(column.id)}
          className="add-task-btn"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>
    </div>
  );
}
