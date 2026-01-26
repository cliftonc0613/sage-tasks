import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add a GitHub commit reference to a task
export const addGitHubCommit = mutation({
  args: {
    taskId: v.id("tasks"),
    commitSha: v.string(),
    message: v.string(),
    url: v.string(),
    author: v.optional(v.string()),
    repo: v.optional(v.string()),
    branch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Create a formatted comment for the commit
    const shortSha = args.commitSha.substring(0, 7);
    const authorInfo = args.author ? ` by ${args.author}` : "";
    const branchInfo = args.branch ? ` on ${args.branch}` : "";
    const repoInfo = args.repo ? ` in ${args.repo}` : "";
    
    const commentContent = `🔗 **Commit** [\`${shortSha}\`](${args.url})${authorInfo}${repoInfo}${branchInfo}\n\n> ${args.message}`;

    const newComment = {
      id: crypto.randomUUID(),
      author: "system" as const,
      content: commentContent,
      createdAt: new Date().toISOString(),
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
      actor: "system",
      details: `GitHub commit ${shortSha}: ${args.message.substring(0, 50)}${args.message.length > 50 ? "..." : ""}`,
      createdAt: new Date().toISOString(),
    });

    return { success: true, commentId: newComment.id };
  },
});

// Update task status from GitHub PR merge
export const updateFromPRMerge = mutation({
  args: {
    taskId: v.id("tasks"),
    prNumber: v.number(),
    prTitle: v.string(),
    prUrl: v.string(),
    mergedBy: v.optional(v.string()),
    repo: v.optional(v.string()),
    targetStatus: v.optional(v.union(
      v.literal("review"),
      v.literal("done")
    )),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const mergedByInfo = args.mergedBy ? ` by ${args.mergedBy}` : "";
    const repoInfo = args.repo ? ` in ${args.repo}` : "";
    
    const commentContent = `🎉 **PR Merged** [#${args.prNumber}](${args.prUrl})${mergedByInfo}${repoInfo}\n\n> ${args.prTitle}`;

    const newComment = {
      id: crypto.randomUUID(),
      author: "system" as const,
      content: commentContent,
      createdAt: new Date().toISOString(),
    };

    const updates: Record<string, unknown> = {
      comments: [...task.comments, newComment],
      updatedAt: new Date().toISOString(),
    };

    // Optionally update status (default to "review" on PR merge)
    const newStatus = args.targetStatus || "review";
    if (task.status !== "done") {
      updates.status = newStatus;
    }

    await ctx.db.patch(args.taskId, updates);

    // Log activity
    await ctx.db.insert("activity", {
      taskId: args.taskId,
      taskTitle: task.title,
      action: "commented",
      actor: "system",
      details: `PR #${args.prNumber} merged: ${args.prTitle.substring(0, 50)}${args.prTitle.length > 50 ? "..." : ""}`,
      createdAt: new Date().toISOString(),
    });

    if (task.status !== "done" && task.status !== newStatus) {
      await ctx.db.insert("activity", {
        taskId: args.taskId,
        taskTitle: task.title,
        action: "moved",
        actor: "system",
        details: `${task.status} → ${newStatus} (PR merged)`,
        createdAt: new Date().toISOString(),
      });
    }

    return { success: true, statusUpdated: task.status !== newStatus };
  },
});

// Get task by partial ID match (for [TASK-xxx] format)
export const findByShortId = query({
  args: { shortId: v.string() },
  handler: async (ctx, args) => {
    const tasks = await ctx.db.query("tasks").collect();
    // Match tasks where _id starts with or contains the shortId
    const matches = tasks.filter(t => 
      t._id.includes(args.shortId) || 
      t._id.toLowerCase().includes(args.shortId.toLowerCase())
    );
    return matches;
  },
});
