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

// Get overdue tasks
export const overdue = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    return tasks.filter((t) => {
      if (!t.dueDate || t.status === "done") return false;
      const due = new Date(t.dueDate);
      due.setHours(23, 59, 59, 999);
      return due < now;
    });
  },
});

// Get recent activity
export const recentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const activities = await ctx.db
      .query("activity")
      .order("desc")
      .take(limit);
    return activities;
  },
});

// Get activity for a specific task
export const taskActivity = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("activity")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    return activities.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
    timeEstimate: v.optional(v.number()),
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
        mentions: v.optional(v.array(v.string())),
      })
    )),
    recurring: v.optional(v.object({
      frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      interval: v.number(),
      nextDue: v.optional(v.string()),
    })),
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
      timeEstimate: args.timeEstimate,
      subtasks: args.subtasks || [],
      comments: args.comments || [],
      recurring: args.recurring,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    });

    // Log activity
    await ctx.db.insert("activity", {
      taskId,
      taskTitle: args.title,
      action: "created",
      actor: args.assignee === "unassigned" ? "system" : args.assignee,
      details: `Created in ${args.status}`,
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
    timeEstimate: v.optional(v.number()),
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
        mentions: v.optional(v.array(v.string())),
      })
    )),
    recurring: v.optional(v.object({
      frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      interval: v.number(),
      nextDue: v.optional(v.string()),
    })),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const task = await ctx.db.get(id);
    if (!task) throw new Error("Task not found");

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    // Track changes for activity log
    const changes: string[] = [];
    if (updates.status && updates.status !== task.status) {
      changes.push(`status: ${task.status} → ${updates.status}`);
      
      // Log completion
      if (updates.status === "done" && task.status !== "done") {
        await ctx.db.insert("activity", {
          taskId: id,
          taskTitle: task.title,
          action: "completed",
          actor: task.assignee === "unassigned" ? "system" : task.assignee,
          createdAt: new Date().toISOString(),
        });
      }
    }
    if (updates.assignee && updates.assignee !== task.assignee) {
      changes.push(`assignee: ${task.assignee} → ${updates.assignee}`);
      await ctx.db.insert("activity", {
        taskId: id,
        taskTitle: task.title,
        action: "assigned",
        actor: "system",
        details: `Assigned to ${updates.assignee}`,
        createdAt: new Date().toISOString(),
      });
    }
    if (updates.priority && updates.priority !== task.priority) {
      changes.push(`priority: ${task.priority} → ${updates.priority}`);
    }

    // Log general update if there are changes
    if (changes.length > 0) {
      await ctx.db.insert("activity", {
        taskId: id,
        taskTitle: task.title,
        action: "updated",
        actor: task.assignee === "unassigned" ? "system" : task.assignee,
        details: changes.join(", "),
        createdAt: new Date().toISOString(),
      });
    }

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

    const oldStatus = task.status;

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

    // Log activity
    if (oldStatus !== args.newStatus) {
      await ctx.db.insert("activity", {
        taskId: args.id,
        taskTitle: task.title,
        action: "moved",
        actor: task.assignee === "unassigned" ? "system" : task.assignee,
        details: `${oldStatus} → ${args.newStatus}`,
        createdAt: new Date().toISOString(),
      });

      // Log completion
      if (args.newStatus === "done") {
        await ctx.db.insert("activity", {
          taskId: args.id,
          taskTitle: task.title,
          action: "completed",
          actor: task.assignee === "unassigned" ? "system" : task.assignee,
          createdAt: new Date().toISOString(),
        });
      }
    }
  },
});

// Delete a task
export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (task) {
      // Log deletion
      await ctx.db.insert("activity", {
        taskId: args.id,
        taskTitle: task.title,
        action: "deleted",
        actor: task.assignee === "unassigned" ? "system" : task.assignee,
        createdAt: new Date().toISOString(),
      });
    }
    await ctx.db.delete(args.id);
  },
});

// Bulk update tasks
export const bulkUpdate = mutation({
  args: {
    ids: v.array(v.id("tasks")),
    status: v.optional(v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in-progress"),
      v.literal("review"),
      v.literal("done")
    )),
    assignee: v.optional(v.union(v.literal("clifton"), v.literal("sage"), v.literal("unassigned"))),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    project: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { ids, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    for (const id of ids) {
      const task = await ctx.db.get(id);
      if (task) {
        await ctx.db.patch(id, {
          ...filteredUpdates,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return { updated: ids.length };
  },
});

// Bulk delete tasks
export const bulkDelete = mutation({
  args: { ids: v.array(v.id("tasks")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
    return { deleted: args.ids.length };
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

    // Parse @mentions
    const mentionRegex = /@(clifton|sage)/gi;
    const mentions = [...args.content.matchAll(mentionRegex)].map(m => m[1].toLowerCase());

    const newComment = {
      id: crypto.randomUUID(),
      author: args.author,
      content: args.content,
      createdAt: new Date().toISOString(),
      mentions: mentions.length > 0 ? mentions : undefined,
    };

    await ctx.db.patch(args.taskId, {
      comments: [...task.comments, newComment],
      updatedAt: new Date().toISOString(),
    });

    // Log activity
    await ctx.db.insert("activity", {
      taskId: args.taskId,
      taskTitle: task.title,
      action: "commented",
      actor: args.author,
      details: args.content.substring(0, 100) + (args.content.length > 100 ? "..." : ""),
      createdAt: new Date().toISOString(),
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

// Get stats for dashboard
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "done").length;
    const pending = tasks.filter(t => t.status !== "done").length;
    const overdue = tasks.filter(t => {
      if (!t.dueDate || t.status === "done") return false;
      const due = new Date(t.dueDate);
      due.setHours(23, 59, 59, 999);
      return due < now;
    }).length;

    const byAssignee = {
      clifton: tasks.filter(t => t.assignee === "clifton").length,
      sage: tasks.filter(t => t.assignee === "sage").length,
      unassigned: tasks.filter(t => t.assignee === "unassigned").length,
    };

    const byStatus = {
      backlog: tasks.filter(t => t.status === "backlog").length,
      todo: tasks.filter(t => t.status === "todo").length,
      "in-progress": tasks.filter(t => t.status === "in-progress").length,
      review: tasks.filter(t => t.status === "review").length,
      done: tasks.filter(t => t.status === "done").length,
    };

    const totalEstimate = tasks.reduce((sum, t) => sum + (t.timeEstimate || 0), 0);

    return {
      total,
      completed,
      pending,
      overdue,
      byAssignee,
      byStatus,
      totalEstimate,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  },
});
