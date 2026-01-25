import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all tasks
export const list = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    return tasks.sort((a, b) => a.order - b.order);
  },
});

// Get tasks by status
export const byStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", args.status as any))
      .collect();
    return tasks.sort((a, b) => a.order - b.order);
  },
});

// Get tasks for Sage (assigned to sage or unassigned in todo)
export const forSage = query({
  args: {},
  handler: async (ctx) => {
    const allTasks = await ctx.db.query("tasks").collect();
    const sageTasks = allTasks.filter(
      (t) => t.assignee === "sage" || (t.assignee === "unassigned" && t.status === "todo")
    );
    return sageTasks;
  },
});

// Create a new task
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    assignee: v.union(v.literal("clifton"), v.literal("sage"), v.literal("unassigned")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    status: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in-progress"),
      v.literal("review"),
      v.literal("done")
    ),
    project: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    subtasks: v.optional(v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        completed: v.boolean(),
      })
    )),
    comments: v.optional(v.array(
      v.object({
        id: v.string(),
        author: v.union(v.literal("clifton"), v.literal("sage"), v.literal("system")),
        content: v.string(),
        createdAt: v.string(),
      })
    )),
  },
  handler: async (ctx, args) => {
    // Get max order for the status column
    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
    const maxOrder = existingTasks.reduce((max, t) => Math.max(max, t.order), -1);

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      assignee: args.assignee,
      priority: args.priority,
      status: args.status,
      project: args.project,
      dueDate: args.dueDate,
      subtasks: args.subtasks || [],
      comments: args.comments || [],
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    });
    return taskId;
  },
});

// Update a task
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    assignee: v.optional(v.union(v.literal("clifton"), v.literal("sage"), v.literal("unassigned"))),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    status: v.optional(v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in-progress"),
      v.literal("review"),
      v.literal("done")
    )),
    project: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    subtasks: v.optional(v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        completed: v.boolean(),
      })
    )),
    comments: v.optional(v.array(
      v.object({
        id: v.string(),
        author: v.union(v.literal("clifton"), v.literal("sage"), v.literal("system")),
        content: v.string(),
        createdAt: v.string(),
      })
    )),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: new Date().toISOString(),
    });
  },
});

// Move task to a different column (status) with ordering
export const move = mutation({
  args: {
    id: v.id("tasks"),
    newStatus: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in-progress"),
      v.literal("review"),
      v.literal("done")
    ),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    // Update orders in the destination column
    const tasksInNewColumn = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", args.newStatus))
      .collect();

    // Shift tasks down to make room
    for (const t of tasksInNewColumn) {
      if (t.order >= args.newOrder && t._id !== args.id) {
        await ctx.db.patch(t._id, { order: t.order + 1 });
      }
    }

    // Update the moved task
    await ctx.db.patch(args.id, {
      status: args.newStatus,
      order: args.newOrder,
      updatedAt: new Date().toISOString(),
    });
  },
});

// Delete a task
export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Add a comment to a task
export const addComment = mutation({
  args: {
    taskId: v.id("tasks"),
    author: v.union(v.literal("clifton"), v.literal("sage"), v.literal("system")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const newComment = {
      id: crypto.randomUUID(),
      author: args.author,
      content: args.content,
      createdAt: new Date().toISOString(),
    };

    await ctx.db.patch(args.taskId, {
      comments: [...task.comments, newComment],
      updatedAt: new Date().toISOString(),
    });
  },
});

// Toggle subtask completion
export const toggleSubtask = mutation({
  args: {
    taskId: v.id("tasks"),
    subtaskId: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const updatedSubtasks = task.subtasks.map((s) =>
      s.id === args.subtaskId ? { ...s, completed: !s.completed } : s
    );

    await ctx.db.patch(args.taskId, {
      subtasks: updatedSubtasks,
      updatedAt: new Date().toISOString(),
    });
  },
});
