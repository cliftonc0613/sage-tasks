'use client';

import { Task } from '@/types';
import { Draggable } from '@hello-pangea/dnd';
import { calculateProgress } from '@/lib/store';

interface TaskCardProps {
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const priorityStyles = {
  low: 'priority-low',
  medium: 'priority-medium',
  high: 'priority-high',
};

const assigneeStyles = {
  clifton: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
  sage: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  unassigned: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

const assigneeEmoji = {
  clifton: '👤',
  sage: '🌿',
  unassigned: '—',
};

export function TaskCard({ task, index, onEdit, onDelete }: TaskCardProps) {
  const progress = calculateProgress(task.subtasks);
  const hasSubtasks = task.subtasks.length > 0;
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onEdit(task)}
          className={`
            glass-card rounded-lg p-3 mb-3 ${priorityStyles[task.priority]}
            ${snapshot.isDragging ? 'glow-purple scale-105' : ''}
            cursor-pointer hover:border-cyan-500/40
            animate-fadeIn group
          `}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-slate-100 text-sm leading-tight flex-1 pr-2">
              {task.title}
            </h3>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Description */}
          {task.description && (
            <p className="text-slate-400 text-xs mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Subtasks Progress */}
          {hasSubtasks && (
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-500">
                  Subtasks: {completedSubtasks}/{task.subtasks.length}
                </span>
                <span className="text-xs text-cyan-400 font-medium">{progress}%</span>
              </div>
              <div className="progress-bar h-1.5">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between text-xs">
            <span className={`px-2 py-0.5 rounded-full text-xs ${assigneeStyles[task.assignee]}`}>
              {assigneeEmoji[task.assignee]} {task.assignee === 'unassigned' ? 'Unassigned' : task.assignee.charAt(0).toUpperCase() + task.assignee.slice(1)}
            </span>
            
            <div className="flex items-center gap-2">
              {/* Comments count */}
              {task.comments.length > 0 && (
                <span className="text-slate-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {task.comments.length}
                </span>
              )}

              {/* Project */}
              {task.project && (
                <span className="text-slate-500 truncate max-w-[60px]" title={task.project}>
                  📁 {task.project}
                </span>
              )}
            </div>
          </div>
          
          {/* Due date */}
          {task.dueDate && (
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
