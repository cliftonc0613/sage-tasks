'use client';

import React from 'react';
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

interface RecurringConfig {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  nextDue?: string;
}

interface TimeEntry {
  id: string;
  startTime: string;
  endTime?: string;
  notes?: string;
  duration: number;
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
  timeEstimate?: number;
  subtasks: Subtask[];
  comments: Comment[];
  recurring?: RecurringConfig;
  blockedBy?: string[];
  order: number;
  createdAt: string;
  timeEntries?: TimeEntry[];
  totalTimeSpent?: number;
  activeTimerStart?: string;
}

interface TaskCardProps {
  task: Task;
  index: number;
  allTasks?: { _id: string; status: string }[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
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

function parseDateString(dateStr: string): Date {
  // Parse YYYY-MM-DD without timezone issues
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  const due = parseDateString(task.dueDate);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

function isDueSoon(task: Task): boolean {
  if (!task.dueDate || task.status === 'done' || isOverdue(task)) return false;
  const due = parseDateString(task.dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 2;
}

function formatTimeEstimate(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function TaskCard({ task, index, allTasks = [], onEdit, onDelete, selectMode, isSelected, onToggleSelect }: TaskCardProps) {
  const progress = calculateProgress(task.subtasks);
  const hasSubtasks = task.subtasks.length > 0;
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const overdue = isOverdue(task);
  const dueSoon = isDueSoon(task);

  // Check if task has incomplete blockers
  const hasIncompleteBlockers = task.blockedBy && task.blockedBy.length > 0 && 
    task.blockedBy.some(blockerId => {
      const blocker = allTasks.find(t => t._id === blockerId);
      return blocker && blocker.status !== 'done';
    });
  const incompleteBlockerCount = task.blockedBy?.filter(blockerId => {
    const blocker = allTasks.find(t => t._id === blockerId);
    return blocker && blocker.status !== 'done';
  }).length || 0;

  const formatDate = (dateStr: string) => {
    // Parse date parts directly to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleClick = (e: React.MouseEvent) => {
    if (selectMode && onToggleSelect) {
      e.stopPropagation();
      onToggleSelect(task._id);
    } else {
      onEdit(task);
    }
  };

  return (
    <Draggable draggableId={task._id} index={index} isDragDisabled={selectMode}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={handleClick}
          className={`task-card ${snapshot.isDragging ? 'dragging' : ''} ${overdue ? 'overdue' : ''} ${dueSoon ? 'due-soon' : ''} ${isSelected ? 'selected' : ''} ${hasIncompleteBlockers ? 'blocked' : ''}`}
        >
          {/* Selection Checkbox */}
          {selectMode && (
            <div 
              className={`task-select-checkbox ${isSelected ? 'checked' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.(task._id);
              }}
            >
              {isSelected && (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          )}
          {/* Blocked Banner */}
          {hasIncompleteBlockers && (
            <div className="blocked-banner">
              🔒 Blocked ({incompleteBlockerCount})
            </div>
          )}
          {/* Overdue Banner */}
          {overdue && (
            <div className="overdue-banner">
              ⚠️ Overdue
            </div>
          )}

          {/* Header: Date + Priority + Actions */}
          <div className="task-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {task.dueDate && (
                <span className={`task-date ${overdue ? 'overdue' : ''} ${dueSoon ? 'due-soon' : ''}`}>
                  {overdue ? '🔥 ' : dueSoon ? '⏰ ' : ''}{formatDate(task.dueDate)}
                </span>
              )}
              <span className={`priority-badge ${task.priority}`}>
                <span className="priority-dot" />
                {priorityLabels[task.priority]}
              </span>
              {task.recurring && (
                <span className="recurring-badge" title={`Repeats every ${task.recurring.interval} ${task.recurring.frequency}`}>
                  🔄
                </span>
              )}
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
              {/* Timer Running Indicator */}
              {task.activeTimerStart && (
                <span className="task-meta-item timer-running" title="Timer running">
                  <span className="timer-pulse-dot">●</span>
                  <span>Recording</span>
                </span>
              )}

              {/* Time Spent / Estimate */}
              {(task.timeEstimate || task.totalTimeSpent) && (
                <span className={`task-meta-item time-tracking ${task.totalTimeSpent && task.timeEstimate && task.totalTimeSpent > task.timeEstimate ? 'over-estimate' : ''}`}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {task.totalTimeSpent ? formatTimeEstimate(task.totalTimeSpent) : '0m'}
                  {task.timeEstimate && (
                    <span className="time-separator">/ {formatTimeEstimate(task.timeEstimate)}</span>
                  )}
                </span>
              )}

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
                <span className="task-meta-item project-tag" title={task.project}>
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
