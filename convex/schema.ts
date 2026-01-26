import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
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
    timeEstimate: v.optional(v.number()), // in minutes
    subtasks: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        completed: v.boolean(),
      })
    ),
    comments: v.array(
      v.object({
        id: v.string(),
        author: v.union(v.literal("clifton"), v.literal("sage"), v.literal("system")),
        content: v.string(),
        createdAt: v.string(),
        mentions: v.optional(v.array(v.string())),
      })
    ),
    order: v.number(),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
    // Recurring task support
    recurring: v.optional(v.object({
      frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      interval: v.number(), // every N days/weeks/months
      nextDue: v.optional(v.string()),
    })),
  })
    .index("by_status", ["status"])
    .index("by_assignee", ["assignee"])
    .index("by_status_order", ["status", "order"])
    .index("by_project", ["project"]),

  // Activity log for tracking changes
  activity: defineTable({
    taskId: v.id("tasks"),
    taskTitle: v.string(),
    action: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("moved"),
      v.literal("completed"),
      v.literal("commented"),
      v.literal("assigned"),
      v.literal("deleted")
    ),
    actor: v.union(v.literal("clifton"), v.literal("sage"), v.literal("system")),
    details: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_task", ["taskId"])
    .index("by_created", ["createdAt"]),
});
