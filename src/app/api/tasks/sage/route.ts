import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// GET - Fetch Sage's tasks with summary
export async function GET() {
  try {
    const allTasks = await convex.query(api.tasks.list);
    
    const sageTasks = allTasks.filter((t) => t.assignee === 'sage');
    
    // Categorize by status
    const pending = sageTasks.filter((t) => ['backlog', 'todo'].includes(t.status));
    const inProgress = sageTasks.filter((t) => t.status === 'in-progress');
    const inReview = sageTasks.filter((t) => t.status === 'review');
    const completed = sageTasks.filter((t) => t.status === 'done');

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
        pending,
        inProgress,
        inReview,
        completed,
      },
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// PATCH - Update a task's status (Sage completing work)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, status, comment, assignee } = body;

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId required' },
        { status: 400 }
      );
    }

    // Verify task exists
    const allTasks = await convex.query(api.tasks.list);
    const task = allTasks.find((t) => t._id === taskId);
    
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Update task status/assignee if provided
    if (status || assignee) {
      const updateArgs: { id: Id<"tasks">; status?: string; assignee?: string } = {
        id: taskId as Id<"tasks">,
      };
      if (status) updateArgs.status = status;
      if (assignee) updateArgs.assignee = assignee;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await convex.mutation(api.tasks.update, updateArgs as any);
    }

    // Add comment if provided
    if (comment) {
      await convex.mutation(api.tasks.addComment, {
        taskId: taskId as Id<"tasks">,
        author: 'sage',
        content: comment,
      });
    }

    // Fetch updated task
    const updatedTasks = await convex.query(api.tasks.list);
    const updatedTask = updatedTasks.find((t) => t._id === taskId);

    return NextResponse.json({
      success: true,
      task: updatedTask,
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update task', details: String(error) },
      { status: 500 }
    );
  }
}

// POST - Add a comment to a task (for @sage replies)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, content, author = 'sage' } = body;

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId required' },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'content required' },
        { status: 400 }
      );
    }

    // Validate author
    if (!['clifton', 'sage', 'system'].includes(author)) {
      return NextResponse.json(
        { success: false, error: 'Invalid author. Must be clifton, sage, or system' },
        { status: 400 }
      );
    }

    // Verify task exists
    const allTasks = await convex.query(api.tasks.list);
    const task = allTasks.find((t) => t._id === taskId);
    
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Add comment
    await convex.mutation(api.tasks.addComment, {
      taskId: taskId as Id<"tasks">,
      author: author as 'clifton' | 'sage' | 'system',
      content,
    });

    // Fetch updated task to return with new comment
    const updatedTasks = await convex.query(api.tasks.list);
    const updatedTask = updatedTasks.find((t) => t._id === taskId);

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      task: updatedTask,
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add comment', details: String(error) },
      { status: 500 }
    );
  }
}
