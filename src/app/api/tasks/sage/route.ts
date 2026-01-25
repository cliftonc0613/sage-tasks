import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'board.json');

async function getBoard() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
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
  }
}

async function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

function getTaskStatus(taskId: string, columns: Record<string, { taskIds: string[] }>): string {
  for (const [columnId, column] of Object.entries(columns)) {
    if (column.taskIds.includes(taskId)) {
      return columnId;
    }
  }
  return 'unknown';
}

// GET - Fetch Sage's tasks with summary
export async function GET() {
  const board = await getBoard();
  
  const allTasks = Object.values(board.tasks) as Record<string, unknown>[];
  const sageTasks = allTasks.filter((t: Record<string, unknown>) => t.assignee === 'sage');
  
  // Categorize by status
  const pending = sageTasks.filter((t: Record<string, unknown>) => {
    const status = getTaskStatus(t.id as string, board.columns);
    return ['backlog', 'todo'].includes(status);
  });
  
  const inProgress = sageTasks.filter((t: Record<string, unknown>) => {
    const status = getTaskStatus(t.id as string, board.columns);
    return status === 'in-progress';
  });
  
  const inReview = sageTasks.filter((t: Record<string, unknown>) => {
    const status = getTaskStatus(t.id as string, board.columns);
    return status === 'review';
  });
  
  const completed = sageTasks.filter((t: Record<string, unknown>) => {
    const status = getTaskStatus(t.id as string, board.columns);
    return status === 'done';
  });

  // Add status to each task
  const addStatus = (tasks: Record<string, unknown>[]) => tasks.map(t => ({
    ...t,
    status: getTaskStatus(t.id as string, board.columns)
  }));

  return NextResponse.json({
    success: true,
    summary: {
      total: sageTasks.length,
      pending: pending.length,
      inProgress: inProgress.length,
      inReview: inReview.length,
      completed: completed.length,
    },
    tasks: {
      pending: addStatus(pending),
      inProgress: addStatus(inProgress),
      inReview: addStatus(inReview),
      completed: addStatus(completed),
    },
    lastChecked: new Date().toISOString(),
  });
}

// PATCH - Update a task's status (Sage completing work)
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { taskId, status, comment } = body;

  if (!taskId) {
    return NextResponse.json({ success: false, error: 'taskId required' }, { status: 400 });
  }

  const board = await getBoard();
  
  if (!board.tasks[taskId]) {
    return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
  }

  // Update status by moving between columns
  if (status && board.columns[status]) {
    // Remove from current column
    for (const column of Object.values(board.columns) as { taskIds: string[] }[]) {
      column.taskIds = column.taskIds.filter((id: string) => id !== taskId);
    }
    // Add to new column
    board.columns[status].taskIds.push(taskId);
    board.tasks[taskId].updatedAt = new Date().toISOString();
  }

  // Add comment if provided
  if (comment) {
    if (!board.tasks[taskId].comments) {
      board.tasks[taskId].comments = [];
    }
    board.tasks[taskId].comments.push({
      id: crypto.randomUUID(),
      author: 'sage',
      content: comment,
      createdAt: new Date().toISOString(),
    });
  }

  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(board, null, 2));

  return NextResponse.json({
    success: true,
    task: { ...board.tasks[taskId], status },
  });
}
