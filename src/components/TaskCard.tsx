'use client';

import { Draggable } from '@hello-pangea/dnd';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Comment {
  id: string;
  author: "clifton" | "sage" | "system";
  content: string;
  createdAt: string;
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
  subtasks: Subtask[];
  comments: Comment[];
  order: number;
  createdAt: string;
}

interface TaskCardProps {
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const assigneeInitials = {
  clifton: 'C',
  sage: 'S',
  unassigned: '?',
};

function calculateProgress(subtasks: Subtask[]): number {
  if (subtasks.length === 0) return 0;
  const completed = subtasks.filter(s => s.completed).length;
  return Math.round((completed / subtasks.length) * 100);
}

export function TaskCard({ task, index, onEdit, onDelete }: TaskCardProps) {
  const progress = calculateProgress(task.subtasks);
  const hasSubtasks = task.subtasks.length > 0;
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onEdit(task)}
          className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
        >
          {/* Header: Date + Priority + Actions */}
          <div className="task-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {task.dueDate && (
                <span className="task-date">{formatDate(task.dueDate)}</span>
              )}
              <span className={`priority-badge ${task.priority}`}>
                <span className="priority-dot" />
                {priorityLabels[task.priority]}
              </span>
            </div>
            <div className="task-card-actions">
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(task._id); }}
                className="btn btn-ghost btn-icon"
                title="Delete"
                style={{ width: '24px', height: '24px' }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Title */}
          <h4 className="task-card-title">{task.title}</h4>
          
          {/* Description */}
          {task.description && (
            <p className="task-card-desc">{task.description}</p>
          )}

          {/* Progress Bar (Subtasks) */}
          {hasSubtasks && (
            <div className="task-progress">
              <div className="task-progress-header">
                <span className="task-progress-label">
                  Subtasks: {completedSubtasks}/{task.subtasks.length}
                </span>
                <span className="task-progress-value">{progress}%</span>
              </div>
              <div className="task-progress-bar">
                <div 
                  className="task-progress-fill" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Footer: Meta + Assignee */}
          <div className="task-card-footer">
            <div className="task-card-meta">
              {/* Comments count */}
              {task.comments.length > 0 && (
                <span className="task-meta-item">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {task.comments.length}
                </span>
              )}

              {/* Project */}
              {task.project && (
                <span className="task-meta-item" title={task.project}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {task.project}
                </span>
              )}
            </div>

            {/* Assignee Avatar */}
            <div className={`assignee-avatar ${task.assignee}`} title={task.assignee}>
              {task.assignee === 'sage' ? '🌿' : assigneeInitials[task.assignee]}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
