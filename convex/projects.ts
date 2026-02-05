import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all projects
export const list = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    return projects.sort((a, b) => a.order - b.order);
  },
});

// Get projects by stage
export const byStage = query({
  args: { stage: v.string() },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_stage", (q) => q.eq("stage", args.stage as any))
      .collect();
    return projects.sort((a, b) => a.order - b.order);
  },
});

// Get project statistics
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    
    const stats = {
      total: projects.length,
      lead: projects.filter(p => p.stage === "lead").length,
      design: projects.filter(p => p.stage === "design").length,
      development: projects.filter(p => p.stage === "development").length,
      review: projects.filter(p => p.stage === "review").length,
      live: projects.filter(p => p.stage === "live").length,
      closed: projects.filter(p => p.stage === "closed").length,
      cliftonProjects: projects.filter(p => p.assignee === "clifton").length,
      sageProjects: projects.filter(p => p.assignee === "sage").length,
      completedProjects: projects.filter(p => p.stage === "closed").length,
      liveProjects: projects.filter(p => p.stage === "live").length,
    };
    
    return stats;
  },
});

// Create a new project
export const create = mutation({
  args: {
    client: v.string(),
    websiteType: v.string(),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    stage: v.union(
      v.literal("lead"),
      v.literal("design"),
      v.literal("development"),
      v.literal("review"),
      v.literal("live"),
      v.literal("closed")
    ),
    budget: v.optional(v.string()),
    technology: v.optional(v.string()),
    launchDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    assignee: v.union(v.literal("clifton"), v.literal("sage"), v.literal("unassigned")),
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
    // Get the next order number for the stage
    const stageProjects = await ctx.db
      .query("projects")
      .withIndex("by_stage", (q) => q.eq("stage", args.stage))
      .collect();
    
    const order = stageProjects.length;
    
    const projectId = await ctx.db.insert("projects", {
      ...args,
      subtasks: args.subtasks || [],
      comments: args.comments || [],
      order,
      createdAt: new Date().toISOString(),
    });
    
    return projectId;
  },
});

// Update an existing project
export const update = mutation({
  args: {
    id: v.id("projects"),
    client: v.optional(v.string()),
    websiteType: v.optional(v.string()),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    budget: v.optional(v.string()),
    technology: v.optional(v.string()),
    launchDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    assignee: v.optional(v.union(v.literal("clifton"), v.literal("sage"), v.literal("unassigned"))),
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
    const { id, ...updates } = args;
    
    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: new Date().toISOString(),
    });
    
    return id;
  },
});

// Move a project to a different stage
export const move = mutation({
  args: {
    id: v.id("projects"),
    newStage: v.union(
      v.literal("lead"),
      v.literal("design"),
      v.literal("development"),
      v.literal("review"),
      v.literal("live"),
      v.literal("closed")
    ),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      stage: args.newStage,
      order: args.newOrder,
      updatedAt: new Date().toISOString(),
    });
    
    return args.id;
  },
});

// Delete a project
export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Bulk update projects
export const bulkUpdate = mutation({
  args: {
    ids: v.array(v.id("projects")),
    updates: v.object({
      stage: v.optional(v.union(
        v.literal("lead"),
        v.literal("design"),
        v.literal("development"),
        v.literal("review"),
        v.literal("live"),
        v.literal("closed")
      )),
      assignee: v.optional(v.union(v.literal("clifton"), v.literal("sage"), v.literal("unassigned"))),
      priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    }),
  },
  handler: async (ctx, args) => {
    const { ids, updates } = args;
    
    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(filteredUpdates).length === 0) {
      return;
    }
    
    for (const id of ids) {
      await ctx.db.patch(id, {
        ...filteredUpdates,
        updatedAt: new Date().toISOString(),
      });
    }
  },
});

// Bulk delete projects
export const bulkDelete = mutation({
  args: { ids: v.array(v.id("projects")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
  },
});