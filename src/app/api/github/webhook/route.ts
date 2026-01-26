import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import crypto from 'crypto';

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Webhook secret for signature verification (optional but recommended)
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

/**
 * Parse task IDs from text
 * Supported formats:
 * - [TASK-xxx] - Task reference with ID fragment
 * - #taskId - Direct task ID reference  
 * - task:xxx - Alternative format
 */
function parseTaskReferences(text: string): string[] {
  const patterns = [
    /\[TASK[_-]([a-zA-Z0-9]+)\]/gi,  // [TASK-xxx] or [TASK_xxx]
    /#([a-zA-Z0-9]{8,})/g,            // #taskId (at least 8 chars for Convex IDs)
    /task[:\s]([a-zA-Z0-9]+)/gi,      // task:xxx or task xxx
  ];

  const refs = new Set<string>();
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        refs.add(match[1]);
      }
    }
  }

  return Array.from(refs);
}

/**
 * Verify GitHub webhook signature
 */
function verifySignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET) {
    // Skip verification if no secret configured
    return true;
  }
  
  if (!signature) {
    return false;
  }

  const sig = Buffer.from(signature, 'utf8');
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = Buffer.from('sha256=' + hmac.update(payload).digest('hex'), 'utf8');
  
  return sig.length === digest.length && crypto.timingSafeEqual(digest, sig);
}

/**
 * Find task by partial ID match
 */
async function findTask(shortId: string): Promise<{ _id: Id<"tasks"> } | null> {
  try {
    const tasks = await convex.query(api.tasks.list);
    // Match tasks where _id contains the shortId
    const match = tasks.find(t => 
      t._id.includes(shortId) || 
      t._id.toLowerCase().includes(shortId.toLowerCase())
    );
    return match || null;
  } catch {
    return null;
  }
}

/**
 * Handle push events - parse commits for task references
 */
async function handlePushEvent(payload: PushPayload): Promise<{ processed: number; errors: string[] }> {
  const results = { processed: 0, errors: [] as string[] };
  const repo = payload.repository?.full_name || 'unknown';
  const branch = payload.ref?.replace('refs/heads/', '') || 'unknown';

  for (const commit of payload.commits || []) {
    const message = commit.message || '';
    const taskRefs = parseTaskReferences(message);

    for (const ref of taskRefs) {
      const task = await findTask(ref);
      if (task) {
        try {
          await convex.mutation(api.github.addGitHubCommit, {
            taskId: task._id,
            commitSha: commit.id,
            message: message.split('\n')[0], // First line only
            url: commit.url,
            author: commit.author?.name || commit.author?.username,
            repo,
            branch,
          });
          results.processed++;
        } catch (err) {
          results.errors.push(`Failed to add commit to task ${ref}: ${err}`);
        }
      }
    }
  }

  return results;
}

/**
 * Handle pull request events - update task on merge
 */
async function handlePullRequestEvent(payload: PRPayload): Promise<{ processed: number; errors: string[] }> {
  const results = { processed: 0, errors: [] as string[] };
  
  // Only process merged PRs
  if (payload.action !== 'closed' || !payload.pull_request?.merged) {
    return results;
  }

  const pr = payload.pull_request;
  const repo = payload.repository?.full_name || 'unknown';
  
  // Parse task references from PR title, body, and branch name
  const searchText = [
    pr.title || '',
    pr.body || '',
    pr.head?.ref || '', // branch name
  ].join(' ');

  const taskRefs = parseTaskReferences(searchText);

  for (const ref of taskRefs) {
    const task = await findTask(ref);
    if (task) {
      try {
        await convex.mutation(api.github.updateFromPRMerge, {
          taskId: task._id,
          prNumber: pr.number,
          prTitle: pr.title,
          prUrl: pr.html_url,
          mergedBy: pr.merged_by?.login,
          repo,
          targetStatus: 'review', // Move to review on PR merge
        });
        results.processed++;
      } catch (err) {
        results.errors.push(`Failed to update task ${ref} from PR: ${err}`);
      }
    }
  }

  return results;
}

// Type definitions for GitHub webhook payloads
interface PushPayload {
  ref?: string;
  repository?: { full_name?: string };
  commits?: Array<{
    id: string;
    message: string;
    url: string;
    author?: { name?: string; username?: string };
  }>;
}

interface PRPayload {
  action?: string;
  pull_request?: {
    merged: boolean;
    number: number;
    title: string;
    body?: string;
    html_url: string;
    merged_by?: { login: string };
    head?: { ref?: string };
  };
  repository?: { full_name?: string };
}

// POST - Receive GitHub webhook
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const deliveryId = request.headers.get('x-github-delivery');

    // Verify signature if secret is configured
    if (!verifySignature(rawBody, signature)) {
      console.error('GitHub webhook signature verification failed');
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);

    console.log(`GitHub webhook received: ${event} (delivery: ${deliveryId})`);

    let result = { processed: 0, errors: [] as string[] };

    switch (event) {
      case 'push':
        result = await handlePushEvent(payload as PushPayload);
        break;
      
      case 'pull_request':
        result = await handlePullRequestEvent(payload as PRPayload);
        break;
      
      case 'ping':
        // GitHub sends a ping event when webhook is first configured
        return NextResponse.json({
          success: true,
          message: 'Pong! Webhook configured successfully.',
          zen: payload.zen,
        });
      
      default:
        // Acknowledge but ignore other events
        return NextResponse.json({
          success: true,
          message: `Event '${event}' acknowledged but not processed`,
        });
    }

    return NextResponse.json({
      success: true,
      event,
      deliveryId,
      ...result,
    });
  } catch (error) {
    console.error('Error processing GitHub webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook', details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Health check / info endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    name: 'Sage Tasks GitHub Webhook',
    version: '1.0.0',
    supportedEvents: ['push', 'pull_request', 'ping'],
    taskReferenceFormats: [
      '[TASK-xxx] - Task ID fragment in brackets',
      '#taskId - Full Convex task ID with hash',
      'task:xxx - Alternative format',
    ],
    documentation: 'See /docs/github-webhook-setup.md',
  });
}
