export type Assignee = 'clifton' | 'sage' | 'unassigned';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  author: Assignee | 'system';
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: Assignee;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt?: string;
  dueDate?: string;
  project?: string;
  subtasks: Subtask[];
  comments: Comment[];
  tags?: string[];
}

export interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

export interface BoardState {
  tasks: Record<string, Task>;
  columns: Record<string, Column>;
  columnOrder: string[];
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TasksForSage {
  assigned: Task[];
  completed: Task[];
  total: number;
}
