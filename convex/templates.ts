import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// List all templates
export const list = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("templates").collect();
    return templates.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Get a single template by ID
export const get = query({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new template
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    defaultPriority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    defaultProject: v.optional(v.string()),
    subtasks: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const templateId = await ctx.db.insert("templates", {
      name: args.name,
      description: args.description,
      defaultPriority: args.defaultPriority,
      defaultProject: args.defaultProject,
      subtasks: args.subtasks,
      createdAt: new Date().toISOString(),
    });
    return templateId;
  },
});

// Update a template
export const update = mutation({
  args: {
    id: v.id("templates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    defaultPriority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    defaultProject: v.optional(v.string()),
    subtasks: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const template = await ctx.db.get(id);
    if (!template) throw new Error("Template not found");

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, filteredUpdates);
  },
});

// Delete a template
export const remove = mutation({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Create a task from a template
export const createTaskFromTemplate = mutation({
  args: {
    templateId: v.id("templates"),
    title: v.string(), // Override the task title
    assignee: v.optional(v.union(v.literal("clifton"), v.literal("sage"), v.literal("unassigned"))),
    status: v.optional(v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in-progress"),
      v.literal("review"),
      v.literal("done")
    )),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    const status = args.status || "todo";
    const assignee = args.assignee || "unassigned";

    // Get max order for the status column
    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", status))
      .collect();
    const maxOrder = existingTasks.reduce((max, t) => Math.max(max, t.order), -1);

    // Create subtasks from template
    const subtasks = template.subtasks.map((title, index) => ({
      id: crypto.randomUUID(),
      title,
      completed: false,
    }));

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: template.description,
      assignee,
      priority: template.defaultPriority,
      status,
      project: template.defaultProject,
      dueDate: args.dueDate,
      subtasks,
      comments: [],
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    });

    // Log activity
    await ctx.db.insert("activity", {
      taskId,
      taskTitle: args.title,
      action: "created",
      actor: assignee === "unassigned" ? "system" : assignee,
      details: `Created from template "${template.name}"`,
      createdAt: new Date().toISOString(),
    });

    return taskId;
  },
});

// Seed default templates (run once)
export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if templates already exist
    const existing = await ctx.db.query("templates").collect();
    if (existing.length > 0) {
      return { seeded: 0, message: "Templates already exist" };
    }

    const defaultTemplates = [
      {
        name: "New Client Onboarding",
        description: "Complete onboarding process for a new client",
        defaultPriority: "high" as const,
        defaultProject: undefined,
        subtasks: [
          "Initial client meeting / discovery call",
          "Gather requirements and project scope",
          "Create project proposal / SOW",
          "Set up client communication channels",
          "Configure project management tools",
          "Schedule kickoff meeting",
          "Send welcome package / documentation",
        ],
      },
      {
        name: "Bug Fix",
        description: "Standard bug fix workflow",
        defaultPriority: "high" as const,
        defaultProject: undefined,
        subtasks: [
          "Investigate and reproduce the bug",
          "Identify root cause",
          "Implement fix",
          "Write/update tests",
          "Code review",
          "Deploy to staging",
          "QA verification",
          "Deploy to production",
        ],
      },
      {
        name: "Feature Development",
        description: "Standard feature development workflow",
        defaultPriority: "medium" as const,
        defaultProject: undefined,
        subtasks: [
          "Design / technical specification",
          "Break down into smaller tasks",
          "Implement core functionality",
          "Add edge case handling",
          "Write unit tests",
          "Integration testing",
          "Code review",
          "Documentation update",
          "Deploy and monitor",
        ],
      },
      {
        name: "Content Creation",
        description: "Workflow for creating content (blog posts, videos, etc.)",
        defaultPriority: "medium" as const,
        defaultProject: "CliftonAI YouTube Scripts",
        subtasks: [
          "Research and outline",
          "First draft",
          "Review and revise",
          "Add visuals / media",
          "Final review",
          "Schedule / publish",
          "Promote on social media",
        ],
      },
      {
        name: "Weekly Review",
        description: "Regular weekly review process",
        defaultPriority: "low" as const,
        defaultProject: undefined,
        subtasks: [
          "Review completed tasks",
          "Update project status",
          "Clear inbox / emails",
          "Review upcoming deadlines",
          "Plan next week priorities",
          "Update documentation",
        ],
      },
    ];

    for (const template of defaultTemplates) {
      await ctx.db.insert("templates", {
        ...template,
        createdAt: new Date().toISOString(),
      });
    }

    return { seeded: defaultTemplates.length, message: "Default templates created" };
  },
});
