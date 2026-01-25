import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'board.json');

// Ensure data directory exists
async function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Get board data
async function getBoard() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Return initial state if file doesn't exist
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

// Save board data
async function saveBoard(board: any) {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(board, null, 2));
}

// GET - Fetch all tasks or filter by assignee
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const assignee = searchParams.get('assignee');
  const status = searchParams.get('status');

  const board = await getBoard();
  let tasks = Object.values(board.tasks);

  // Filter by assignee
  if (assignee) {
    tasks = tasks.filter((t: any) => t.assignee === assignee);
  }

  // Filter by status (column)
  if (status) {
    const columnTaskIds = board.columns[status]?.taskIds || [];
    tasks = tasks.filter((t: any) => columnTaskIds.includes(t.id));
  }

  // For Sage endpoint, include column info
  const tasksWithStatus = tasks.map((task: any) => {
    let taskStatus = 'unknown';
    for (const [columnId, column] of Object.entries(board.columns) as any) {
      if (column.taskIds.includes(task.id)) {
        taskStatus = columnId;
        break;
      }
    }
    return { ...task, status: taskStatus };
  });

  return NextResponse.json({
    success: true,
    count: tasksWithStatus.length,
    tasks: tasksWithStatus,
  });
}

// POST - Create a new task
export async function POST(request: NextRequest) {
  const body = await request.json();
  const board = await getBoard();

  const task = {
    id: crypto.randomUUID(),
    title: body.title,
    description: body.description || '',
    assignee: body.assignee || 'unassigned',
    priority: body.priority || 'medium',
    createdAt: new Date().toISOString(),
    dueDate: body.dueDate,
    project: body.project,
    subtasks: body.subtasks || [],
    comments: body.comments || [],
  };

  board.tasks[task.id] = task;
  
  const column = body.column || 'todo';
  if (board.columns[column]) {
    board.columns[column].taskIds.push(task.id);
  }

  await saveBoard(board);

  return NextResponse.json({
    success: true,
    task,
  });
}

// PUT - Update board state (sync from client)
export async function PUT(request: NextRequest) {
  const board = await request.json();
  await saveBoard(board);

  return NextResponse.json({
    success: true,
    message: 'Board synced',
  });
}
