import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Task templates for quick task creation
  templates: defineTable({
    name: v.string(),
    description: v.string(),
    defaultPriority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    defaultProject: v.optional(v.string()),
    subtasks: v.array(v.string()), // Array of subtask titles (legacy/simple format)
    // Enhanced subtask format with metadata
    subtasksEnhanced: v.optional(v.array(v.object({
      title: v.string(),
      timeEstimate: v.optional(v.number()), // in minutes
      priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
      dueDayOffset: v.optional(v.number()), // days from project start
      phase: v.optional(v.string()), // grouping for workflow phases
    }))),
    // Template metadata
    totalEstimatedDays: v.optional(v.number()), // total project duration in days
    category: v.optional(v.string()), // template category (e.g., "web-design", "development")
    createdAt: v.string(),
  })
    .index("by_name", ["name"])
    .index("by_category", ["category"]),

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
      v.literal("done"),
      v.literal("on-hold")
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
    // GitHub PR links
    linkedPRs: v.optional(v.array(
      v.object({
        id: v.string(),                // UUID for this link
        prNumber: v.number(),          // PR #123
        prUrl: v.string(),             // Full GitHub URL
        repo: v.string(),              // "owner/repo"
        title: v.string(),             // PR title
        author: v.optional(v.string()), // GitHub username
        status: v.union(
          v.literal("open"),
          v.literal("draft"),
          v.literal("merged"),
          v.literal("closed")
        ),
        linkedAt: v.string(),          // ISO timestamp
        updatedAt: v.optional(v.string()),
        additions: v.optional(v.number()),
        deletions: v.optional(v.number()),
        changedFiles: v.optional(v.number()),
      })
    )),
  })
    .index("by_status", ["status"])
    .index("by_assignee", ["assignee"])
    .index("by_status_order", ["status", "order"])
    .index("by_project", ["project"]),

  // Sales pipeline prospects
  prospects: defineTable({
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
    order: v.number(),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_stage", ["stage"])
    .index("by_stage_order", ["stage", "order"])
    .index("by_urgency", ["urgency"]),

  // Web design projects pipeline
  projects: defineTable({
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
    order: v.number(),
    assignee: v.union(v.literal("clifton"), v.literal("sage"), v.literal("unassigned")),
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
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_stage", ["stage"])
    .index("by_stage_order", ["stage", "order"])
    .index("by_assignee", ["assignee"]),

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
