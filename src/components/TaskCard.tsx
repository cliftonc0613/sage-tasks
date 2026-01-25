'use client';

import { Task } from '@/types';
import { Draggable } from '@hello-pangea/dnd';

interface TaskCardProps {
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const priorityColors = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-red-500',
};

const assigneeColors = {
  clifton: 'bg-blue-100 text-blue-800',
  sage: 'bg-emerald-100 text-emerald-800',
  unassigned: 'bg-gray-100 text-gray-600',
};

const assigneeEmoji = {
  clifton: '👤',
  sage: '🌿',
  unassigned: '—',
};

export function TaskCard({ task, index, onEdit, onDelete }: TaskCardProps) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            bg-white rounded-lg shadow-sm p-3 mb-2 border-l-4
            ${priorityColors[task.priority]}
            ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''}
            hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing
          `}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-gray-900 text-sm leading-tight flex-1">
              {task.title}
            </h3>
            <div className="flex gap-1 ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                className="text-gray-400 hover:text-blue-600 p-1"
                title="Edit"
              >
                ✏️
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                className="text-gray-400 hover:text-red-600 p-1"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
          
          {task.description && (
            <p className="text-gray-600 text-xs mb-2 line-clamp-2">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs">
            <span className={`px-2 py-0.5 rounded-full ${assigneeColors[task.assignee]}`}>
              {assigneeEmoji[task.assignee]} {task.assignee === 'unassigned' ? 'Unassigned' : task.assignee.charAt(0).toUpperCase() + task.assignee.slice(1)}
            </span>
            
            {task.project && (
              <span className="text-gray-500 truncate max-w-[80px]" title={task.project}>
                📁 {task.project}
              </span>
            )}
          </div>
          
          {task.dueDate && (
            <div className="mt-2 text-xs text-gray-500">
              📅 {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
