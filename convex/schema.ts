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
      })
    ),
    order: v.number(),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_assignee", ["assignee"])
    .index("by_status_order", ["status", "order"]),
});
