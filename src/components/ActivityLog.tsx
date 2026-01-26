'use client';

import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface ActivityLogProps {
  limit?: number;
  compact?: boolean;
}

const actionIcons: Record<string, string> = {
  created: '✨',
  updated: '📝',
  moved: '➡️',
  completed: '✅',
  commented: '💬',
  assigned: '👤',
  deleted: '🗑️',
};

const actionLabels: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  moved: 'moved',
  completed: 'completed',
  commented: 'commented on',
  assigned: 'assigned',
  deleted: 'deleted',
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ActivityLog({ limit = 20, compact = false }: ActivityLogProps) {
  const activities = useQuery(api.tasks.recentActivity, { limit });

  if (activities === undefined) {
    return (
      <div className="activity-log">
        <div className="activity-loading">Loading activity...</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="activity-log">
        <div className="activity-empty">No recent activity</div>
      </div>
    );
  }

  return (
    <div className={`activity-log ${compact ? 'compact' : ''}`}>
      {activities.map((activity) => (
        <div key={activity._id} className="activity-item">
          <div className="activity-icon">
            {actionIcons[activity.action] || '📌'}
          </div>
          <div className="activity-content">
            <div className="activity-main">
              <span className={`activity-actor ${activity.actor}`}>
                {activity.actor === 'sage' ? '🌿 Sage' : 
                 activity.actor === 'clifton' ? 'Clifton' : 'System'}
              </span>
              <span className="activity-action">
                {actionLabels[activity.action] || activity.action}
              </span>
              <span className="activity-task" title={activity.taskTitle}>
                {activity.taskTitle}
              </span>
            </div>
            {activity.details && !compact && (
              <div className="activity-details">{activity.details}</div>
            )}
          </div>
          <div className="activity-time">{formatTime(activity.createdAt)}</div>
        </div>
      ))}
    </div>
  );
}
