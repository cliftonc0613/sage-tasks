export type Assignee = 'clifton' | 'sage' | 'unassigned';

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: Assignee;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  dueDate?: string;
  project?: string;
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
