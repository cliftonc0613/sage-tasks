'use client';

import { BoardState, Task } from '@/types';
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
      return JSON.parse(saved);
    } catch {
      return initialState;
    }
  }
  return initialState;
}

export function saveBoard(state: BoardState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  };
}
