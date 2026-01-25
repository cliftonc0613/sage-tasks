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

const columnGlowColors: Record<string, string> = {
  'backlog': 'hover:shadow-[0_0_30px_rgba(128,128,128,0.1)]',
  'todo': 'hover:shadow-[0_0_30px_rgba(0,245,255,0.1)]',
  'in-progress': 'hover:shadow-[0_0_30px_rgba(255,200,0,0.1)]',
  'review': 'hover:shadow-[0_0_30px_rgba(178,74,255,0.1)]',
  'done': 'hover:shadow-[0_0_30px_rgba(0,255,136,0.1)]',
};

const columnHeaderGradients: Record<string, string> = {
  'backlog': 'from-gray-500/20 to-transparent',
  'todo': 'from-cyan-500/20 to-transparent',
  'in-progress': 'from-yellow-500/20 to-transparent',
  'review': 'from-purple-500/20 to-transparent',
  'done': 'from-green-500/20 to-transparent',
};

const columnIcons: Record<string, string> = {
  'backlog': '📋',
  'todo': '📝',
  'in-progress': '⚡',
  'review': '👀',
  'done': '✅',
};

export function Column({ column, tasks, onAddTask, onEditTask, onDeleteTask }: ColumnProps) {
  return (
    <div 
      className={`
        flex flex-col w-80 min-w-[320px] rounded-2xl column-glass
        transition-all duration-300
        ${columnGlowColors[column.id] || ''}
      `}
    >
      {/* Column Header */}
      <div className={`
        p-4 font-semibold text-gray-200 
        flex items-center justify-between 
        border-b border-white/5
        bg-gradient-to-b ${columnHeaderGradients[column.id] || 'from-gray-500/20 to-transparent'}
        rounded-t-2xl
      `}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{columnIcons[column.id] || '📌'}</span>
          <span>{column.title}</span>
          <span className="bg-white/10 text-gray-300 text-xs px-2 py-0.5 rounded-full ml-1">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(column.id)}
          className="text-gray-500 hover:text-cyan-400 hover:bg-white/5 rounded-lg p-2 transition-all"
          title="Add task"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className={`
              flex-1 p-3 min-h-[200px] transition-all duration-200 rounded-b-2xl
              ${snapshot.isDraggingOver ? 'drag-over' : ''}
            `}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <span className="text-2xl mb-2 opacity-30">{columnIcons[column.id] || '📌'}</span>
                <span className="text-sm">No tasks</span>
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
    </div>
  );
}
