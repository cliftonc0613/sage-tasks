# GitHub Webhook Setup for Sage Tasks

This document explains how to configure GitHub webhooks to sync commits and PRs with Sage Tasks.

## Features

- **Commit Tracking**: Commits referencing task IDs are automatically linked to tasks as comments
- **PR Merge Handling**: When PRs are merged, referenced tasks are updated and moved to "review" status
- **Activity Logging**: All GitHub events are logged in the task activity feed

## Task Reference Formats

Reference tasks in your commit messages, PR titles, or branch names using these formats:

| Format | Example | Description |
|--------|---------|-------------|
| `[TASK-xxx]` | `[TASK-j57abc] Fix login bug` | Task ID fragment in brackets |
| `#taskId` | `#j57abc123def` | Full or partial Convex task ID |
| `task:xxx` | `task:j57abc Fix bug` | Alternative colon format |

### Examples

```bash
# Commit message with task reference
git commit -m "[TASK-j57abc] Implement user authentication"

# PR title with task reference
# "Fix login validation [TASK-j57abc]"

# Branch name with task reference
git checkout -b feature/TASK-j57abc-login-fix
```

## Webhook Setup

### 1. Get Your Webhook URL

Your webhook URL is:
```
https://sage-tasks-cliftonc0613s-projects.vercel.app/api/github/webhook
```

### 2. Configure GitHub Repository

1. Go to your GitHub repository → **Settings** → **Webhooks**
2. Click **Add webhook**
3. Configure:
   - **Payload URL**: `https://sage-tasks-cliftonc0613s-projects.vercel.app/api/github/webhook`
   - **Content type**: `application/json`
   - **Secret**: (optional) Set a secret and add `GITHUB_WEBHOOK_SECRET` to your environment
   - **SSL verification**: Enable
   - **Events**: Select "Let me select individual events":
     - ✅ Pushes
     - ✅ Pull requests

4. Click **Add webhook**

### 3. (Optional) Add Webhook Secret

For security, you can verify webhook signatures:

1. Generate a secret: `openssl rand -hex 32`
2. Add to GitHub webhook configuration
3. Add to Vercel environment variables:
   ```
   GITHUB_WEBHOOK_SECRET=your_secret_here
   ```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Convex deployment URL |
| `GITHUB_WEBHOOK_SECRET` | No | Secret for signature verification |

## How It Works

### Push Events

When you push commits:
1. GitHub sends a webhook to `/api/github/webhook`
2. Each commit message is parsed for task references
3. Matching tasks get a new comment with:
   - Commit SHA (linked)
   - Author name
   - Repository and branch
   - Commit message

### Pull Request Merges

When a PR is merged:
1. GitHub sends a `pull_request` event with `action: closed` and `merged: true`
2. Task references are parsed from:
   - PR title
   - PR body/description
   - Source branch name
3. Matching tasks are:
   - Updated with a PR merge comment
   - Moved to "review" status (if not already "done")

## Testing

### Verify Webhook Setup

```bash
curl https://sage-tasks-cliftonc0613s-projects.vercel.app/api/github/webhook
```

Should return:
```json
{
  "success": true,
  "name": "Sage Tasks GitHub Webhook",
  "supportedEvents": ["push", "pull_request", "ping"]
}
```

### Test with a Commit

1. Create a task and note its ID (e.g., `j57abc123`)
2. Make a commit: `git commit -m "[TASK-j57abc] Test webhook"`
3. Push to GitHub
4. Check the task in Sage Tasks - you should see a new comment

### Manual Test

```bash
# Simulate a push event
curl -X POST https://sage-tasks-cliftonc0613s-projects.vercel.app/api/github/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{
    "ref": "refs/heads/main",
    "repository": {"full_name": "user/repo"},
    "commits": [{
      "id": "abc123def456",
      "message": "[TASK-yourtaskid] Test commit",
      "url": "https://github.com/user/repo/commit/abc123",
      "author": {"name": "Test User"}
    }]
  }'
```

## Troubleshooting

### Webhook Not Triggering

1. Check GitHub webhook delivery history (Settings → Webhooks → Recent Deliveries)
2. Verify the URL is correct and accessible
3. Check for SSL/certificate issues

### Task Not Found

- Ensure the task ID in your commit/PR matches an existing task
- Task IDs are case-insensitive partial matches
- Use at least 6-8 characters of the task ID for reliable matching

### Signature Verification Failed

- Ensure `GITHUB_WEBHOOK_SECRET` matches the secret in GitHub
- Check the secret doesn't have extra whitespace

## API Reference

### POST /api/github/webhook

Receives GitHub webhook events.

**Headers:**
- `X-GitHub-Event`: Event type (push, pull_request, ping)
- `X-GitHub-Delivery`: Unique delivery ID
- `X-Hub-Signature-256`: HMAC signature (if secret configured)

**Response:**
```json
{
  "success": true,
  "event": "push",
  "deliveryId": "abc-123",
  "processed": 2,
  "errors": []
}
```

### GET /api/github/webhook

Returns webhook info and supported events.

## Convex Mutations

The webhook uses these Convex mutations:

### `github.addGitHubCommit`

Adds a commit reference to a task.

```typescript
{
  taskId: Id<"tasks">,
  commitSha: string,
  message: string,
  url: string,
  author?: string,
  repo?: string,
  branch?: string
}
```

### `github.updateFromPRMerge`

Updates a task when a PR is merged.

```typescript
{
  taskId: Id<"tasks">,
  prNumber: number,
  prTitle: string,
  prUrl: string,
  mergedBy?: string,
  repo?: string,
  targetStatus?: "review" | "done"
}
```
