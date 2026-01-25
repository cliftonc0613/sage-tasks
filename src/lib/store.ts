'use client';

import { BoardState, Task, Subtask, Comment } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'sage-tasks-board';

export const initialState: BoardState = {
  tasks: {},
  columns: {
    'backlog': { id: 'backlog', title: 'Backlog', taskIds: [] },
    'todo': { id: 'todo', title: 'To Do', taskIds: [] },
    'in-progress': { id: 'in-progress', title: 'In Progress', taskIds: [] },
    'review': { id: 'review', title: 'Review', taskIds: [] },
    'done': { id: 'done', title: 'Done', taskIds: [] },
  },
  columnOrder: ['backlog', 'todo', 'in-progress', 'review', 'done'],
};

export function loadBoard(): BoardState {
  if (typeof window === 'undefined') return initialState;
  
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Migrate old tasks to include subtasks and comments
      for (const taskId in parsed.tasks) {
        if (!parsed.tasks[taskId].subtasks) {
          parsed.tasks[taskId].subtasks = [];
        }
        if (!parsed.tasks[taskId].comments) {
          parsed.tasks[taskId].comments = [];
        }
      }
      return parsed;
    } catch {
      return initialState;
    }
  }
  return initialState;
}

export function saveBoard(state: BoardState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  
  // Also sync to API for Sage access
  fetch('/api/tasks', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  }).catch(() => {
    // Ignore API errors, localStorage is the source of truth for client
  });
}

export function createTask(
  title: string,
  description: string,
  assignee: Task['assignee'] = 'unassigned',
  priority: Task['priority'] = 'medium',
  project?: string,
  dueDate?: string
): Task {
  return {
    id: uuidv4(),
    title,
    description,
    assignee,
    priority,
    createdAt: new Date().toISOString(),
    project,
    dueDate,
    subtasks: [],
    comments: [],
  };
}

export function createSubtask(title: string): Subtask {
  return {
    id: uuidv4(),
    title,
    completed: false,
  };
}

export function createComment(
  content: string,
  author: Comment['author'] = 'clifton'
): Comment {
  return {
    id: uuidv4(),
    author,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function calculateProgress(subtasks: Subtask[]): number {
  if (subtasks.length === 0) return 0;
  const completed = subtasks.filter(s => s.completed).length;
  return Math.round((completed / subtasks.length) * 100);
}
