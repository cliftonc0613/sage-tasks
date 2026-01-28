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

// Enhanced subtask type for richer templates
const enhancedSubtaskValidator = v.object({
  title: v.string(),
  timeEstimate: v.optional(v.number()), // in minutes
  priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  dueDayOffset: v.optional(v.number()), // days from project start
  phase: v.optional(v.string()), // workflow phase grouping
});

// Create a new template
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    defaultPriority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    defaultProject: v.optional(v.string()),
    subtasks: v.array(v.string()),
    subtasksEnhanced: v.optional(v.array(enhancedSubtaskValidator)),
    totalEstimatedDays: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const templateId = await ctx.db.insert("templates", {
      name: args.name,
      description: args.description,
      defaultPriority: args.defaultPriority,
      defaultProject: args.defaultProject,
      subtasks: args.subtasks,
      subtasksEnhanced: args.subtasksEnhanced,
      totalEstimatedDays: args.totalEstimatedDays,
      category: args.category,
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
    subtasksEnhanced: v.optional(v.array(enhancedSubtaskValidator)),
    totalEstimatedDays: v.optional(v.number()),
    category: v.optional(v.string()),
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
    startDate: v.optional(v.string()), // Project start date for calculating subtask due dates
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

    // Create subtasks from template - prefer enhanced format if available
    let subtasks;
    if (template.subtasksEnhanced && template.subtasksEnhanced.length > 0) {
      subtasks = template.subtasksEnhanced.map((sub) => ({
        id: crypto.randomUUID(),
        title: sub.title,
        completed: false,
      }));
    } else {
      subtasks = template.subtasks.map((title) => ({
        id: crypto.randomUUID(),
        title,
        completed: false,
      }));
    }

    // Calculate total time estimate from enhanced subtasks
    let totalTimeEstimate: number | undefined;
    if (template.subtasksEnhanced) {
      const total = template.subtasksEnhanced.reduce((sum, sub) => sum + (sub.timeEstimate || 0), 0);
      if (total > 0) totalTimeEstimate = total;
    }

    // Calculate due date from template's total estimated days if not provided
    let dueDate = args.dueDate;
    if (!dueDate && template.totalEstimatedDays) {
      const startDate = args.startDate ? new Date(args.startDate) : new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + template.totalEstimatedDays);
      dueDate = endDate.toISOString().split('T')[0];
    }

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: template.description,
      assignee,
      priority: template.defaultPriority,
      status,
      project: template.defaultProject,
      dueDate,
      timeEstimate: totalTimeEstimate,
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

// Web Design Project template data (exported for reuse)
const webDesignProjectTemplate = {
  name: "Web Design Project",
  description: "Complete web design project workflow from discovery to launch. Covers the full lifecycle of a client website project.",
  defaultPriority: "high" as const,
  defaultProject: undefined,
  category: "web-design",
  totalEstimatedDays: 30,
  subtasks: [
    "Discovery & Requirements (Days 1-3)",
    "Design mockups/wireframes (Days 4-7)",
    "Content collection from client (Days 5-10)",
    "Development setup (repo, hosting) (Day 8)",
    "Homepage build (Days 9-12)",
    "Inner pages build (Days 13-18)",
    "Mobile responsiveness (Days 19-20)",
    "Forms & integrations (Days 21-22)",
    "SEO & metadata (Days 23-24)",
    "Testing & QA (Days 25-26)",
    "Client review (Days 27-28)",
    "Launch & deployment (Day 29)",
    "Post-launch support handoff (Day 30)",
  ],
  subtasksEnhanced: [
    { title: "Discovery & Requirements", timeEstimate: 480, priority: "high" as const, dueDayOffset: 3, phase: "Planning" },
    { title: "Design mockups/wireframes", timeEstimate: 960, priority: "high" as const, dueDayOffset: 7, phase: "Design" },
    { title: "Content collection from client", timeEstimate: 240, priority: "medium" as const, dueDayOffset: 10, phase: "Design" },
    { title: "Development setup (repo, hosting)", timeEstimate: 120, priority: "high" as const, dueDayOffset: 8, phase: "Development" },
    { title: "Homepage build", timeEstimate: 960, priority: "high" as const, dueDayOffset: 12, phase: "Development" },
    { title: "Inner pages build", timeEstimate: 1440, priority: "medium" as const, dueDayOffset: 18, phase: "Development" },
    { title: "Mobile responsiveness", timeEstimate: 480, priority: "high" as const, dueDayOffset: 20, phase: "Development" },
    { title: "Forms & integrations", timeEstimate: 480, priority: "medium" as const, dueDayOffset: 22, phase: "Development" },
    { title: "SEO & metadata", timeEstimate: 240, priority: "medium" as const, dueDayOffset: 24, phase: "Optimization" },
    { title: "Testing & QA", timeEstimate: 480, priority: "high" as const, dueDayOffset: 26, phase: "Quality" },
    { title: "Client review", timeEstimate: 240, priority: "high" as const, dueDayOffset: 28, phase: "Quality" },
    { title: "Launch & deployment", timeEstimate: 240, priority: "high" as const, dueDayOffset: 29, phase: "Launch" },
    { title: "Post-launch support handoff", timeEstimate: 120, priority: "low" as const, dueDayOffset: 30, phase: "Launch" },
  ],
};

// Seed just the Web Design Project template (can be run on existing databases)
export const seedWebDesignTemplate = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if this specific template already exists
    const existing = await ctx.db
      .query("templates")
      .withIndex("by_name", (q) => q.eq("name", "Web Design Project"))
      .first();

    if (existing) {
      // Update the existing template with latest version
      await ctx.db.patch(existing._id, {
        ...webDesignProjectTemplate,
      });
      return { action: "updated", id: existing._id, message: "Web Design Project template updated" };
    }

    // Create the template
    const id = await ctx.db.insert("templates", {
      ...webDesignProjectTemplate,
      createdAt: new Date().toISOString(),
    });

    return { action: "created", id, message: "Web Design Project template created" };
  },
});

// Add a single template (useful for adding new templates without resetting)
export const addTemplate = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    defaultPriority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    defaultProject: v.optional(v.string()),
    subtasks: v.array(v.string()),
    subtasksEnhanced: v.optional(v.array(enhancedSubtaskValidator)),
    totalEstimatedDays: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if template with this name already exists
    const existing = await ctx.db
      .query("templates")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (existing) {
      // Update existing template
      await ctx.db.patch(existing._id, {
        description: args.description,
        defaultPriority: args.defaultPriority,
        defaultProject: args.defaultProject,
        subtasks: args.subtasks,
        subtasksEnhanced: args.subtasksEnhanced,
        totalEstimatedDays: args.totalEstimatedDays,
        category: args.category,
      });
      return { action: "updated", id: existing._id };
    }

    // Create new template
    const id = await ctx.db.insert("templates", {
      ...args,
      createdAt: new Date().toISOString(),
    });
    return { action: "created", id };
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
      {
        name: "Web Design Project",
        description: "Complete web design project workflow from discovery to launch. Covers the full lifecycle of a client website project.",
        defaultPriority: "high" as const,
        defaultProject: undefined,
        category: "web-design",
        totalEstimatedDays: 30,
        subtasks: [
          "Discovery & Requirements (Days 1-3)",
          "Design mockups/wireframes (Days 4-7)",
          "Content collection from client (Days 5-10)",
          "Development setup (repo, hosting) (Day 8)",
          "Homepage build (Days 9-12)",
          "Inner pages build (Days 13-18)",
          "Mobile responsiveness (Days 19-20)",
          "Forms & integrations (Days 21-22)",
          "SEO & metadata (Days 23-24)",
          "Testing & QA (Days 25-26)",
          "Client review (Days 27-28)",
          "Launch & deployment (Day 29)",
          "Post-launch support handoff (Day 30)",
        ],
        subtasksEnhanced: [
          {
            title: "Discovery & Requirements",
            timeEstimate: 480, // 8 hours
            priority: "high" as const,
            dueDayOffset: 3,
            phase: "Planning",
          },
          {
            title: "Design mockups/wireframes",
            timeEstimate: 960, // 16 hours
            priority: "high" as const,
            dueDayOffset: 7,
            phase: "Design",
          },
          {
            title: "Content collection from client",
            timeEstimate: 240, // 4 hours (follow-up time)
            priority: "medium" as const,
            dueDayOffset: 10,
            phase: "Design",
          },
          {
            title: "Development setup (repo, hosting)",
            timeEstimate: 120, // 2 hours
            priority: "high" as const,
            dueDayOffset: 8,
            phase: "Development",
          },
          {
            title: "Homepage build",
            timeEstimate: 960, // 16 hours
            priority: "high" as const,
            dueDayOffset: 12,
            phase: "Development",
          },
          {
            title: "Inner pages build",
            timeEstimate: 1440, // 24 hours
            priority: "medium" as const,
            dueDayOffset: 18,
            phase: "Development",
          },
          {
            title: "Mobile responsiveness",
            timeEstimate: 480, // 8 hours
            priority: "high" as const,
            dueDayOffset: 20,
            phase: "Development",
          },
          {
            title: "Forms & integrations",
            timeEstimate: 480, // 8 hours
            priority: "medium" as const,
            dueDayOffset: 22,
            phase: "Development",
          },
          {
            title: "SEO & metadata",
            timeEstimate: 240, // 4 hours
            priority: "medium" as const,
            dueDayOffset: 24,
            phase: "Optimization",
          },
          {
            title: "Testing & QA",
            timeEstimate: 480, // 8 hours
            priority: "high" as const,
            dueDayOffset: 26,
            phase: "Quality",
          },
          {
            title: "Client review",
            timeEstimate: 240, // 4 hours
            priority: "high" as const,
            dueDayOffset: 28,
            phase: "Quality",
          },
          {
            title: "Launch & deployment",
            timeEstimate: 240, // 4 hours
            priority: "high" as const,
            dueDayOffset: 29,
            phase: "Launch",
          },
          {
            title: "Post-launch support handoff",
            timeEstimate: 120, // 2 hours
            priority: "low" as const,
            dueDayOffset: 30,
            phase: "Launch",
          },
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
