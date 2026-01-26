import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// GET - Fetch all tasks or filter by assignee/status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignee = searchParams.get('assignee');
    const status = searchParams.get('status');

    const tasks = await convex.query(api.tasks.list);
    let filteredTasks = tasks;

    // Filter by assignee
    if (assignee) {
      filteredTasks = filteredTasks.filter((t) => t.assignee === assignee);
    }

    // Filter by status
    if (status) {
      filteredTasks = filteredTasks.filter((t) => t.status === status);
    }

    return NextResponse.json({
      success: true,
      count: filteredTasks.length,
      tasks: filteredTasks,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { success: false, error: 'title required' },
        { status: 400 }
      );
    }

    const taskId = await convex.mutation(api.tasks.create, {
      title: body.title,
      description: body.description || '',
      assignee: body.assignee || 'unassigned',
      priority: body.priority || 'medium',
      status: body.status || 'todo',
      project: body.project,
      dueDate: body.dueDate,
      timeEstimate: body.timeEstimate,
      subtasks: body.subtasks || [],
      comments: body.comments || [],
      recurring: body.recurring,
      blockedBy: body.blockedBy,
    });

    // Fetch the created task
    const tasks = await convex.query(api.tasks.list);
    const task = tasks.find((t) => t._id === taskId);

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT - Update an existing task
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'id required' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateArgs: Record<string, unknown> = { id: body.id as Id<"tasks"> };
    
    if (body.title !== undefined) updateArgs.title = body.title;
    if (body.description !== undefined) updateArgs.description = body.description;
    if (body.assignee !== undefined) updateArgs.assignee = body.assignee;
    if (body.priority !== undefined) updateArgs.priority = body.priority;
    if (body.status !== undefined) updateArgs.status = body.status;
    if (body.project !== undefined) updateArgs.project = body.project;
    if (body.dueDate !== undefined) updateArgs.dueDate = body.dueDate;
    if (body.timeEstimate !== undefined) updateArgs.timeEstimate = body.timeEstimate;
    if (body.subtasks !== undefined) updateArgs.subtasks = body.subtasks;
    if (body.comments !== undefined) updateArgs.comments = body.comments;
    if (body.recurring !== undefined) updateArgs.recurring = body.recurring;
    if (body.blockedBy !== undefined) updateArgs.blockedBy = body.blockedBy;
    if (body.order !== undefined) updateArgs.order = body.order;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await convex.mutation(api.tasks.update, updateArgs as any);

    // Fetch the updated task
    const tasks = await convex.query(api.tasks.list);
    const task = tasks.find((t) => t._id === body.id);

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update task', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - Delete a task
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id required (as query param)' },
        { status: 400 }
      );
    }

    await convex.mutation(api.tasks.remove, { id: id as Id<"tasks"> });

    return NextResponse.json({
      success: true,
      message: 'Task deleted',
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete task', details: String(error) },
      { status: 500 }
    );
  }
}
