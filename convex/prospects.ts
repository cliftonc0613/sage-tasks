import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all prospects
export const list = query({
  args: {},
  handler: async (ctx) => {
    const prospects = await ctx.db.query("prospects").collect();
    return prospects.sort((a, b) => a.order - b.order);
  },
});

// Get prospects by stage
export const byStage = query({
  args: { stage: v.string() },
  handler: async (ctx, args) => {
    const prospects = await ctx.db
      .query("prospects")
      .withIndex("by_stage", (q) => q.eq("stage", args.stage as any))
      .collect();
    return prospects.sort((a, b) => a.order - b.order);
  },
});

// Get prospect statistics
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const prospects = await ctx.db.query("prospects").collect();
    
    const stats = {
      total: prospects.length,
      lead: prospects.filter(p => p.stage === "lead").length,
      site_built: prospects.filter(p => p.stage === "site_built").length,
      outreach: prospects.filter(p => p.stage === "outreach").length,
      contacted: prospects.filter(p => p.stage === "contacted").length,
      follow_up: prospects.filter(p => p.stage === "follow_up").length,
      negotiating: prospects.filter(p => p.stage === "negotiating").length,
      closed_won: prospects.filter(p => p.stage === "closed_won").length,
      closed_lost: prospects.filter(p => p.stage === "closed_lost").length,
    };
    
    return stats;
  },
});

// Create a new prospect
export const create = mutation({
  args: {
    title: v.string(),
    company: v.string(),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    facebookUrl: v.optional(v.string()),
    githubRepo: v.optional(v.string()),
    loomUrl: v.optional(v.string()),
    industry: v.optional(v.string()),
    location: v.optional(v.string()),
    lastContacted: v.optional(v.string()),
    notes: v.optional(v.string()),
    stage: v.union(
      v.literal("lead"),
      v.literal("site_built"),
      v.literal("outreach"),
      v.literal("contacted"),
      v.literal("follow_up"),
      v.literal("negotiating"),
      v.literal("closed_won"),
      v.literal("closed_lost")
    ),
    urgency: v.union(
      v.literal("fresh"),
      v.literal("warm"),
      v.literal("cold"),
      v.literal("no_contact")
    ),
  },
  handler: async (ctx, args) => {
    // Get the current maximum order for the stage
    const existingProspects = await ctx.db
      .query("prospects")
      .withIndex("by_stage", (q) => q.eq("stage", args.stage))
      .collect();
    
    const maxOrder = Math.max(0, ...existingProspects.map(p => p.order));
    
    const prospectId = await ctx.db.insert("prospects", {
      ...args,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    });
    
    return prospectId;
  },
});

// Update an existing prospect
export const update = mutation({
  args: {
    id: v.id("prospects"),
    title: v.optional(v.string()),
    company: v.optional(v.string()),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    facebookUrl: v.optional(v.string()),
    githubRepo: v.optional(v.string()),
    loomUrl: v.optional(v.string()),
    industry: v.optional(v.string()),
    location: v.optional(v.string()),
    lastContacted: v.optional(v.string()),
    notes: v.optional(v.string()),
    urgency: v.optional(v.union(
      v.literal("fresh"),
      v.literal("warm"),
      v.literal("cold"),
      v.literal("no_contact")
    )),
  },
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;
    
    await ctx.db.patch(id, {
      ...updateData,
      updatedAt: new Date().toISOString(),
    });
    
    return id;
  },
});

// Move a prospect to a new stage
export const move = mutation({
  args: {
    id: v.id("prospects"),
    newStage: v.union(
      v.literal("lead"),
      v.literal("site_built"),
      v.literal("outreach"),
      v.literal("contacted"),
      v.literal("follow_up"),
      v.literal("negotiating"),
      v.literal("closed_won"),
      v.literal("closed_lost")
    ),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const prospect = await ctx.db.get(args.id);
    if (!prospect) throw new Error("Prospect not found");
    
    const oldStage = prospect.stage;
    
    // If moving to a different stage, update the order of other prospects
    if (oldStage !== args.newStage) {
      // Get all prospects in the new stage
      const newStageProspects = await ctx.db
        .query("prospects")
        .withIndex("by_stage", (q) => q.eq("stage", args.newStage))
        .collect();
      
      // Reorder prospects in the new stage to make room
      for (const p of newStageProspects) {
        if (p.order >= args.newOrder) {
          await ctx.db.patch(p._id, { order: p.order + 1 });
        }
      }
      
      // Get prospects in the old stage and reorder to close the gap
      const oldStageProspects = await ctx.db
        .query("prospects")
        .withIndex("by_stage", (q) => q.eq("stage", oldStage))
        .collect();
      
      for (const p of oldStageProspects) {
        if (p._id !== args.id && p.order > prospect.order) {
          await ctx.db.patch(p._id, { order: p.order - 1 });
        }
      }
    } else {
      // Moving within the same stage
      const stageProspects = await ctx.db
        .query("prospects")
        .withIndex("by_stage", (q) => q.eq("stage", args.newStage))
        .collect();
      
      if (args.newOrder > prospect.order) {
        // Moving down: shift others up
        for (const p of stageProspects) {
          if (p._id !== args.id && p.order > prospect.order && p.order <= args.newOrder) {
            await ctx.db.patch(p._id, { order: p.order - 1 });
          }
        }
      } else {
        // Moving up: shift others down
        for (const p of stageProspects) {
          if (p._id !== args.id && p.order >= args.newOrder && p.order < prospect.order) {
            await ctx.db.patch(p._id, { order: p.order + 1 });
          }
        }
      }
    }
    
    // Update the prospect
    await ctx.db.patch(args.id, {
      stage: args.newStage,
      order: args.newOrder,
      updatedAt: new Date().toISOString(),
    });
    
    return args.id;
  },
});

// Delete a prospect
export const remove = mutation({
  args: { id: v.id("prospects") },
  handler: async (ctx, args) => {
    const prospect = await ctx.db.get(args.id);
    if (!prospect) throw new Error("Prospect not found");
    
    // Delete the prospect
    await ctx.db.delete(args.id);
    
    // Reorder remaining prospects in the stage
    const stageProspects = await ctx.db
      .query("prospects")
      .withIndex("by_stage", (q) => q.eq("stage", prospect.stage))
      .collect();
    
    for (const p of stageProspects) {
      if (p.order > prospect.order) {
        await ctx.db.patch(p._id, { order: p.order - 1 });
      }
    }
    
    return args.id;
  },
});

// Seed initial data
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if data already exists
    const existing = await ctx.db.query("prospects").collect();
    if (existing.length > 0) return;

    const sampleProspects = [
      {
        title: 'Henderson Plumbing Website',
        company: 'Henderson Plumbing Services',
        contactName: 'Mike Henderson',
        phone: '+1-555-0123',
        email: 'mike@hendersonplumbing.com',
        website: 'https://henderson-plumbing.com',
        facebookUrl: 'https://facebook.com/hendersonplumbing',
        githubRepo: 'cliftonc0613/henderson-plumbing',
        industry: 'plumbing',
        location: 'Greenville, SC',
        lastContacted: '2024-02-01',
        notes: 'Completed website, very satisfied customer',
        stage: 'closed_won' as const,
        urgency: 'fresh' as const,
        order: 1,
        createdAt: '2024-01-15T00:00:00Z',
      },
      {
        title: 'Kicking Tree Lawn Care',
        company: 'Kicking Tree LLC',
        contactName: 'John Tree',
        phone: '+1-555-0456',
        email: 'john@kickingtreelawncare.com',
        website: 'https://kicking-tree-lawn-care.vercel.app',
        facebookUrl: 'https://facebook.com/kickingtree',
        industry: 'landscaping',
        location: 'Greenville, SC', 
        lastContacted: '2024-02-03',
        notes: 'StoryBrand implementation completed',
        stage: 'closed_won' as const,
        urgency: 'fresh' as const,
        order: 2,
        createdAt: '2024-02-01T00:00:00Z',
      },
      {
        title: 'New Heights Tree Service',
        company: 'New Heights Tree Service',
        contactName: 'Sarah Heights',
        phone: '+1-555-0789',
        email: 'sarah@newheightstree.com',
        industry: 'tree_services',
        location: 'Anderson, SC',
        lastContacted: '2024-01-28',
        notes: 'In development - 75% complete',
        stage: 'negotiating' as const,
        urgency: 'warm' as const,
        order: 1,
        createdAt: '2024-02-03T00:00:00Z',
      },
      {
        title: 'Blue Ridge Painting',
        company: 'Blue Ridge Painting Co',
        contactName: 'Tom Blue',
        phone: '+1-555-0321',
        email: 'tom@blueridgepainting.com',
        facebookUrl: 'https://facebook.com/blueridgepainting',
        industry: 'painting',
        location: 'Spartanburg, SC',
        lastContacted: '2024-01-20',
        notes: 'Interested in website package',
        stage: 'follow_up' as const,
        urgency: 'cold' as const,
        order: 1,
        createdAt: '2024-01-25T00:00:00Z',
      }
    ];

    for (const prospect of sampleProspects) {
      await ctx.db.insert("prospects", prospect);
    }

    return `Seeded ${sampleProspects.length} prospects`;
  },
});