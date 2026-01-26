import { v } from "convex/values";
import { internalAction } from "./_generated/server";

// Webhook URL for Sage notifications (configure via environment variable)
// For now, we just log - set SAGE_WEBHOOK_URL when ready
const SAGE_WEBHOOK_URL = process.env.SAGE_WEBHOOK_URL;

export const notifySage = internalAction({
  args: {
    taskId: v.string(),
    taskTitle: v.string(),
    actionType: v.union(v.literal("mention"), v.literal("assignment")),
    commentContent: v.optional(v.string()),
    commentAuthor: v.optional(v.string()),
    assignedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payload = {
      taskId: args.taskId,
      taskTitle: args.taskTitle,
      actionType: args.actionType,
      ...(args.commentContent && { commentContent: args.commentContent }),
      ...(args.commentAuthor && { commentAuthor: args.commentAuthor }),
      ...(args.assignedBy && { assignedBy: args.assignedBy }),
      timestamp: new Date().toISOString(),
    };

    // Log the notification for debugging
    console.log("[Sage Notification]", JSON.stringify(payload, null, 2));

    // Send webhook if URL is configured
    if (SAGE_WEBHOOK_URL) {
      try {
        const response = await fetch(SAGE_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.error(
            `[Sage Notification] Webhook failed: ${response.status} ${response.statusText}`
          );
        } else {
          console.log("[Sage Notification] Webhook sent successfully");
        }
      } catch (error) {
        console.error("[Sage Notification] Webhook error:", error);
      }
    } else {
      console.log("[Sage Notification] No webhook URL configured - notification logged only");
    }
  },
});
