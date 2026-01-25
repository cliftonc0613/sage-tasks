'use client';

import { Column as ColumnType, Task } from '@/types';
import { Droppable } from '@hello-pangea/dnd';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const columnConfig: Record<string, { icon: string; colorClass: string }> = {
  'backlog': { icon: '📋', colorClass: 'backlog' },
  'todo': { icon: '', colorClass: 'todo' },
  'in-progress': { icon: '', colorClass: 'in-progress' },
  'review': { icon: '', colorClass: 'review' },
  'done': { icon: '', colorClass: 'done' },
};

export function Column({ column, tasks, onAddTask, onEditTask, onDeleteTask }: ColumnProps) {
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
                key={task.id}
                task={task}
                index={index}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
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
