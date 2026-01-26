import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Task templates for quick task creation
  templates: defineTable({
    name: v.string(),
    description: v.string(),
    defaultPriority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    defaultProject: v.optional(v.string()),
    subtasks: v.array(v.string()), // Array of subtask titles
    createdAt: v.string(),
  })
    .index("by_name", ["name"]),

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
    // Time tracking
    timeEntries: v.optional(v.array(
      v.object({
        id: v.string(),
        startTime: v.string(), // ISO string
        endTime: v.optional(v.string()), // ISO string, undefined if timer is running
        notes: v.optional(v.string()),
        duration: v.number(), // in minutes (calculated when stopped)
      })
    )),
    totalTimeSpent: v.optional(v.number()), // in minutes
    activeTimerStart: v.optional(v.string()), // ISO string if timer is currently running
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
    // Task dependencies - array of task IDs that block this task
    blockedBy: v.optional(v.array(v.id("tasks"))),
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
