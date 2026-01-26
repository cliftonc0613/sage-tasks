import { action } from "./_generated/server";
import { v } from "convex/values";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "7746405442";

export const sendNotification = action({
  args: {
    message: v.string(),
    parseMode: v.optional(v.union(v.literal("HTML"), v.literal("Markdown"))),
  },
  handler: async (ctx, args) => {
    if (!TELEGRAM_BOT_TOKEN) {
      console.warn("TELEGRAM_BOT_TOKEN not set, skipping notification");
      return { success: false, error: "Bot token not configured" };
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: args.message,
            parse_mode: args.parseMode || "HTML",
          }),
        }
      );

      const result = await response.json();
      return { success: result.ok, result };
    } catch (error) {
      console.error("Telegram notification error:", error);
      return { success: false, error: String(error) };
    }
  },
});

export const notifyTaskUpdate = action({
  args: {
    taskTitle: v.string(),
    action: v.string(),
    actor: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const emoji = {
      created: "✨",
      completed: "✅",
      moved: "➡️",
      assigned: "👤",
      commented: "💬",
      deleted: "🗑️",
    }[args.action] || "📝";

    const actorName = args.actor === "sage" ? "🌿 Sage" : 
                      args.actor === "clifton" ? "👤 Clifton" : "System";

    let message = `${emoji} <b>${actorName}</b> ${args.action} task:\n<i>${args.taskTitle}</i>`;
    
    if (args.details) {
      message += `\n\n${args.details}`;
    }

    // Call the sendNotification action
    if (!TELEGRAM_BOT_TOKEN) {
      console.warn("TELEGRAM_BOT_TOKEN not set, skipping notification");
      return { success: false, error: "Bot token not configured" };
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: "HTML",
          }),
        }
      );

      const result = await response.json();
      return { success: result.ok, result };
    } catch (error) {
      console.error("Telegram notification error:", error);
      return { success: false, error: String(error) };
    }
  },
});

export const notifyDueReminder = action({
  args: {
    tasks: v.array(v.object({
      title: v.string(),
      dueDate: v.string(),
      assignee: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    if (args.tasks.length === 0) {
      return { success: true, message: "No tasks to remind" };
    }

    let message = "⏰ <b>Due Date Reminders</b>\n\n";
    
    for (const task of args.tasks) {
      const dueDate = new Date(task.dueDate);
      const assignee = task.assignee === "sage" ? "🌿" : 
                       task.assignee === "clifton" ? "👤" : "❓";
      message += `${assignee} <i>${task.title}</i>\n   📅 Due: ${dueDate.toLocaleDateString()}\n\n`;
    }

    if (!TELEGRAM_BOT_TOKEN) {
      console.warn("TELEGRAM_BOT_TOKEN not set, skipping notification");
      return { success: false, error: "Bot token not configured" };
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: "HTML",
          }),
        }
      );

      const result = await response.json();
      return { success: result.ok, result };
    } catch (error) {
      console.error("Telegram notification error:", error);
      return { success: false, error: String(error) };
    }
  },
});
