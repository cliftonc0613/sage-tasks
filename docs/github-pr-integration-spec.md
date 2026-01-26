# GitHub Pull Request Integration Spec

**Version:** 2.1  
**Date:** 2025-01-26  
**Status:** Approved  
**Author:** Sage (AI Assistant)

---

## Decisions (Resolved by Clifton)

All open questions have been resolved:

| Question | Decision |
|----------|----------|
| **Auto-create tasks from PRs?** | ✅ YES - New PRs auto-create tasks in `todo` column |
| **PR status → Task status automation?** | ✅ YES - Full lifecycle mapping (see below) |
| **Repository scope?** | ✅ ALL repos (no allowlist needed) |
| **GitHub API integration?** | ✅ YES - Fetch PR details when manually linking (uses existing `GITHUB_TOKEN`) |
| **PR filters?** | ✅ YES - Add "Tasks with open PRs" filter |
| **Notifications?** | ✅ YES - PR events trigger Telegram notifications |

### PR Status → Task Status Automation

| PR Event | Task Action |
|----------|-------------|
| PR opened | Move task to `in-progress` |
| PR ready for review (draft → open) | Move task to `review` |
| PR merged | Move task to `review` (existing behavior) |
| PR closed without merge | Move task to `on-hold` + auto-comment "⚠️ PR #X closed without merge. Task moved to on-hold." |

---

## Overview

This document specifies enhancements to the GitHub integration for Sage Tasks, building on the existing webhook infrastructure. The goal is to provide full PR lifecycle tracking, not just merge events.

### Current State

The existing implementation handles:
- ✅ Commit tracking via push webhooks
- ✅ PR merge events (adds comments, moves task to "review")
- ✅ Task reference parsing (`[TASK-xxx]`, `#taskId`, `task:xxx`)
- ✅ Webhook endpoint at `/api/github/webhook`

### What This Spec Adds

- 🆕 Full PR lifecycle tracking (open → review → merge/close)
- 🆕 Dedicated PR storage (not just comments)
- 🆕 PR status badges on task cards
- 🆕 Manual PR linking via UI
- 🆕 PR list in task detail view
- 🆕 Auto-create tasks from new PRs (optional)

---

## User Stories

### US-1: Link a PR to a Task
> As a user, I can manually link a GitHub PR to a task so I can track related code changes.

**Acceptance Criteria:**
- Task modal has "GitHub" tab showing linked PRs
- User can paste a PR URL to link it
- System validates the PR exists (optional GitHub API call)
- Linked PR appears in task immediately

### US-2: See PR Status on Task Card
> As a user, I see PR status badges on task cards so I can quickly identify tasks with active PRs.

**Acceptance Criteria:**
- Task card shows PR badge when PR is linked
- Badge color indicates status:
  - 🟢 Green: Open/Draft
  - 🟣 Purple: Merged
  - 🔴 Red: Closed (not merged)
- Badge shows PR count if multiple PRs linked

### US-3: Auto-Link via Commit Message
> As a user, commits mentioning a task ID automatically link the associated PR.

**Acceptance Criteria:**
- Push event parses commits for task references
- If commit is part of an open PR, link PR to task
- Works with existing reference formats

### US-4: Auto-Create Tasks from PRs
> As a user, new PRs can optionally auto-create tasks for review tracking.

**Acceptance Criteria:**
- Opt-in feature (configured per repository or globally)
- New PR creates task in "review" status
- Task includes PR title, link, and author
- Works with `[CREATE-TASK]` tag in PR body

---

## Database Schema (Convex)

### Option A: Embedded PR Array (Recommended)

Add `linkedPRs` field to the `tasks` table:

```typescript
// convex/schema.ts - Add to tasks table
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
    // Metadata for display
    additions: v.optional(v.number()),
    deletions: v.optional(v.number()),
    changedFiles: v.optional(v.number()),
  })
)),
```

**Pros:**
- Simple to query (PRs always with task)
- No joins needed
- Matches existing patterns (subtasks, comments)

**Cons:**
- Harder to query "all PRs across all tasks"

### Option B: Separate PR Links Table

```typescript
// convex/schema.ts - New table
prLinks: defineTable({
  taskId: v.id("tasks"),
  prNumber: v.number(),
  prUrl: v.string(),
  repo: v.string(),
  title: v.string(),
  author: v.optional(v.string()),
  status: v.union(
    v.literal("open"),
    v.literal("draft"),
    v.literal("merged"),
    v.literal("closed")
  ),
  linkedAt: v.string(),
  updatedAt: v.optional(v.string()),
  additions: v.optional(v.number()),
  deletions: v.optional(v.number()),
  changedFiles: v.optional(v.number()),
})
  .index("by_task", ["taskId"])
  .index("by_repo_pr", ["repo", "prNumber"])
  .index("by_status", ["status"]),
```

**Pros:**
- Easy to query all PRs
- Cleaner for complex queries
- Natural deduplication (repo + prNumber unique)

**Cons:**
- Requires additional queries to fetch PRs with task

### Recommendation

**Use Option A (embedded array)** for consistency with existing patterns. Can migrate to Option B later if needed.

---

## API Endpoints

### Enhanced Webhook Handler

Modify `/api/github/webhook` to handle additional events:

```typescript
// Handle pull_request events (all actions)
switch (payload.action) {
  case 'opened':
  case 'reopened':
    // Link PR to referenced tasks
    await linkPRToTasks(pr, 'open');
    break;
  
  case 'ready_for_review':
    // Update from draft to open
    await updatePRStatus(pr, 'open');
    break;
  
  case 'converted_to_draft':
    await updatePRStatus(pr, 'draft');
    break;
  
  case 'closed':
    if (pr.merged) {
      await updatePRStatus(pr, 'merged');
      // Optionally move task to 'review' (existing behavior)
    } else {
      await updatePRStatus(pr, 'closed');
    }
    break;
  
  case 'edited':
    // Update title if changed
    await updatePRMetadata(pr);
    break;
}
```

### New Convex Mutations

```typescript
// convex/github.ts - New mutations

// Link a PR to a task (manual or automatic)
export const linkPR = mutation({
  args: {
    taskId: v.id("tasks"),
    prNumber: v.number(),
    prUrl: v.string(),
    repo: v.string(),
    title: v.string(),
    author: v.optional(v.string()),
    status: v.union(
      v.literal("open"),
      v.literal("draft"),
      v.literal("merged"),
      v.literal("closed")
    ),
    additions: v.optional(v.number()),
    deletions: v.optional(v.number()),
    changedFiles: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const existingPRs = task.linkedPRs || [];
    
    // Check for duplicate
    const existing = existingPRs.find(
      p => p.repo === args.repo && p.prNumber === args.prNumber
    );
    if (existing) {
      // Update existing PR
      return ctx.db.patch(args.taskId, {
        linkedPRs: existingPRs.map(p =>
          p.id === existing.id
            ? { ...p, status: args.status, title: args.title, updatedAt: new Date().toISOString() }
            : p
        ),
        updatedAt: new Date().toISOString(),
      });
    }

    // Add new PR
    const newPR = {
      id: crypto.randomUUID(),
      ...args,
      linkedAt: new Date().toISOString(),
    };

    await ctx.db.patch(args.taskId, {
      linkedPRs: [...existingPRs, newPR],
      updatedAt: new Date().toISOString(),
    });

    // Log activity
    await ctx.db.insert("activity", {
      taskId: args.taskId,
      taskTitle: task.title,
      action: "updated",
      actor: "system",
      details: `PR #${args.prNumber} linked (${args.status})`,
      createdAt: new Date().toISOString(),
    });

    return newPR.id;
  },
});

// Update PR status
export const updatePRStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    repo: v.string(),
    prNumber: v.number(),
    status: v.union(
      v.literal("open"),
      v.literal("draft"),
      v.literal("merged"),
      v.literal("closed")
    ),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const existingPRs = task.linkedPRs || [];
    const prIndex = existingPRs.findIndex(
      p => p.repo === args.repo && p.prNumber === args.prNumber
    );

    if (prIndex === -1) return { updated: false };

    existingPRs[prIndex] = {
      ...existingPRs[prIndex],
      status: args.status,
      updatedAt: new Date().toISOString(),
    };

    await ctx.db.patch(args.taskId, {
      linkedPRs: existingPRs,
      updatedAt: new Date().toISOString(),
    });

    return { updated: true };
  },
});

// Unlink a PR from a task
export const unlinkPR = mutation({
  args: {
    taskId: v.id("tasks"),
    prId: v.string(), // The internal UUID
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.taskId, {
      linkedPRs: (task.linkedPRs || []).filter(p => p.id !== args.prId),
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Find all tasks with PRs in a specific repo
export const findTasksByRepo = query({
  args: { repo: v.string() },
  handler: async (ctx, args) => {
    const tasks = await ctx.db.query("tasks").collect();
    return tasks.filter(t =>
      t.linkedPRs?.some(p => p.repo === args.repo)
    );
  },
});
```

### Manual Link API Endpoint (Optional)

```typescript
// /api/github/link/route.ts
// POST - Manually link a PR by URL
export async function POST(request: NextRequest) {
  const { taskId, prUrl } = await request.json();
  
  // Parse PR URL: https://github.com/owner/repo/pull/123
  const match = prUrl.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/);
  if (!match) {
    return NextResponse.json({ error: 'Invalid PR URL' }, { status: 400 });
  }
  
  const [, repo, prNumber] = match;
  
  // Optionally fetch PR details from GitHub API
  // const prDetails = await fetchPRFromGitHub(repo, prNumber);
  
  await convex.mutation(api.github.linkPR, {
    taskId,
    prNumber: parseInt(prNumber),
    prUrl,
    repo,
    title: `PR #${prNumber}`, // Or fetched title
    status: 'open',
  });
  
  return NextResponse.json({ success: true });
}
```

---

## UI Components

### 1. PR Badge on Task Card

```tsx
// components/PRBadge.tsx
interface PRBadgeProps {
  prs: LinkedPR[];
}

export function PRBadge({ prs }: PRBadgeProps) {
  if (!prs || prs.length === 0) return null;

  const hasOpen = prs.some(p => p.status === 'open' || p.status === 'draft');
  const hasMerged = prs.some(p => p.status === 'merged');
  const allClosed = prs.every(p => p.status === 'closed');

  // Determine badge color
  let color = 'gray';
  let icon = '🔗';
  
  if (hasMerged) {
    color = 'purple';
    icon = '🟣';
  } else if (hasOpen) {
    color = 'green';
    icon = '🟢';
  } else if (allClosed) {
    color = 'red';
    icon = '🔴';
  }

  return (
    <span className={`pr-badge pr-badge-${color}`} title={`${prs.length} PR(s) linked`}>
      {icon} {prs.length > 1 ? prs.length : ''}
    </span>
  );
}
```

### 2. GitHub Tab in Task Modal

Add a new tab to `TaskModal.tsx`:

```tsx
// In TaskModal tabs
<button
  onClick={() => setActiveTab('github')}
  className={`modal-tab ${activeTab === 'github' ? 'active' : ''}`}
>
  🔗 GitHub ({(task?.linkedPRs?.length || 0) + (task?.comments?.filter(c => c.author === 'system').length || 0)})
</button>

// GitHub Tab Content
{activeTab === 'github' && (
  <div className="github-tab">
    {/* Link PR Section */}
    <div className="link-pr-section">
      <h4>Link a Pull Request</h4>
      <div className="link-pr-form">
        <input
          type="url"
          value={prUrl}
          onChange={(e) => setPrUrl(e.target.value)}
          placeholder="https://github.com/owner/repo/pull/123"
          className="input"
        />
        <button onClick={handleLinkPR} className="btn btn-primary">
          Link PR
        </button>
      </div>
    </div>

    {/* Linked PRs List */}
    <div className="linked-prs-section">
      <h4>Linked Pull Requests</h4>
      {linkedPRs.length === 0 ? (
        <p className="empty-state">No PRs linked yet</p>
      ) : (
        <ul className="pr-list">
          {linkedPRs.map(pr => (
            <li key={pr.id} className="pr-item">
              <PRStatusIcon status={pr.status} />
              <a href={pr.prUrl} target="_blank" rel="noopener noreferrer">
                {pr.repo}#{pr.prNumber}
              </a>
              <span className="pr-title">{pr.title}</span>
              {pr.author && <span className="pr-author">by {pr.author}</span>}
              <button onClick={() => handleUnlinkPR(pr.id)} className="btn btn-ghost">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>

    {/* Git Activity (existing comments from system) */}
    <div className="git-activity-section">
      <h4>Git Activity</h4>
      {/* Filter and show system comments about commits/PRs */}
    </div>
  </div>
)}
```

### 3. PR Status Icon Component

```tsx
// components/PRStatusIcon.tsx
export function PRStatusIcon({ status }: { status: PRStatus }) {
  switch (status) {
    case 'open':
      return <span className="pr-status pr-open" title="Open">🟢</span>;
    case 'draft':
      return <span className="pr-status pr-draft" title="Draft">⚪</span>;
    case 'merged':
      return <span className="pr-status pr-merged" title="Merged">🟣</span>;
    case 'closed':
      return <span className="pr-status pr-closed" title="Closed">🔴</span>;
  }
}
```

---

## GitHub Webhook Events to Handle

### pull_request

| Action | Behavior |
|--------|----------|
| `opened` | Link PR to referenced tasks with status "open" |
| `reopened` | Update status to "open" |
| `closed` (merged) | Update status to "merged", optionally move task |
| `closed` (not merged) | Update status to "closed" |
| `converted_to_draft` | Update status to "draft" |
| `ready_for_review` | Update status to "open" |
| `edited` | Update PR title if changed |

### push

| Data | Behavior |
|------|----------|
| Commit message | Parse for task references, add commit comment |
| Head branch | If branch has open PR, link PR to task |

### Additional Events (Future)

- `pull_request_review`: Track review status
- `check_run`: Show CI status on PR
- `issue_comment`: Sync PR comments to task

---

## Implementation Steps

### Phase 1: Schema & Backend (1-2 days)
1. [ ] Add `linkedPRs` field to tasks schema
2. [ ] Run Convex migration
3. [ ] Add `linkPR`, `updatePRStatus`, `unlinkPR` mutations
4. [ ] Add `findTasksByRepo` query

### Phase 2: Webhook Enhancement (1 day)
5. [ ] Extend webhook handler for all `pull_request` actions
6. [ ] Add logic to link PRs on `opened` event
7. [ ] Add status update logic for lifecycle events
8. [ ] Test with real GitHub webhooks

### Phase 3: UI Components (2-3 days)
9. [ ] Create `PRBadge` component
10. [ ] Add badge to `TaskCard.tsx`
11. [ ] Add "GitHub" tab to `TaskModal.tsx`
12. [ ] Create PR list component
13. [ ] Add manual link form
14. [ ] Style all new components

### Phase 4: Polish & Testing (1 day)
15. [ ] Add loading states
16. [ ] Add error handling
17. [ ] Test full PR lifecycle
18. [ ] Update documentation

---

---

## Appendix: Type Definitions

```typescript
// types/github.ts

export type PRStatus = 'open' | 'draft' | 'merged' | 'closed';

export interface LinkedPR {
  id: string;
  prNumber: number;
  prUrl: string;
  repo: string;
  title: string;
  author?: string;
  status: PRStatus;
  linkedAt: string;
  updatedAt?: string;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
}

export interface PRWebhookPayload {
  action: string;
  pull_request: {
    number: number;
    title: string;
    body?: string;
    html_url: string;
    state: 'open' | 'closed';
    draft: boolean;
    merged: boolean;
    merged_at?: string;
    merged_by?: { login: string };
    user: { login: string };
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
    };
    additions: number;
    deletions: number;
    changed_files: number;
  };
  repository: {
    full_name: string;
    html_url: string;
  };
  sender: { login: string };
}
```

---

## References

- [GitHub Webhooks Documentation](https://docs.github.com/en/webhooks)
- [Existing Webhook Setup](/docs/github-webhook-setup.md)
- [Convex Schema](/convex/schema.ts)
- [Existing GitHub Mutations](/convex/github.ts)
