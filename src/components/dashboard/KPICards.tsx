'use client';

interface Task {
  _id: string;
  status: string;
  dueDate?: string;
  createdAt: string;
  timeEstimate?: number;
}

interface Stats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  byAssignee: { clifton: number; sage: number; unassigned: number };
  byStatus: { backlog: number; todo: number; 'in-progress': number; review: number; done: number };
  totalEstimate: number;
  completionRate: number;
}

interface KPICardsProps {
  tasks: Task[];
  stats?: Stats;
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function KPICards({ tasks, stats }: KPICardsProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Use stats if available, otherwise calculate
  const totalTasks = stats?.total ?? tasks.length;
  const completedTasks = stats?.completed ?? tasks.filter(t => t.status === 'done').length;
  const pendingTasks = stats?.pending ?? tasks.filter(t => t.status !== 'done').length;
  const overdueTasks = stats?.overdue ?? tasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }).length;
  const completionRate = stats?.completionRate ?? (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
  const totalEstimate = stats?.totalEstimate ?? tasks.reduce((sum, t) => sum + (t.timeEstimate || 0), 0);

  // Calculate trend (tasks created in last 7 days vs previous 7 days)
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
  
  const thisWeek = tasks.filter(t => new Date(t.createdAt).getTime() > weekAgo).length;
  const lastWeek = tasks.filter(t => {
    const time = new Date(t.createdAt).getTime();
    return time > twoWeeksAgo && time <= weekAgo;
  }).length;
  
  const trend = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek * 100).toFixed(1) : '0';

  const cards = [
    {
      title: 'Total Tasks',
      value: totalTasks,
      trend: `${Number(trend) >= 0 ? '+' : ''}${trend}%`,
      trendUp: Number(trend) >= 0,
      icon: '📊',
      color: 'var(--accent)',
    },
    {
      title: 'Completed',
      value: completedTasks,
      trend: `${completionRate}% rate`,
      trendUp: completionRate > 50,
      icon: '✅',
      color: 'var(--status-complete)',
    },
    {
      title: 'In Progress',
      value: pendingTasks,
      trend: totalEstimate > 0 ? formatTime(totalEstimate) + ' total' : 'Active',
      trendUp: true,
      icon: '⚡',
      color: '#3b82f6',
    },
    {
      title: 'Overdue',
      value: overdueTasks,
      trend: overdueTasks > 0 ? 'Needs attention' : 'All clear',
      trendUp: overdueTasks === 0,
      icon: '⚠️',
      color: overdueTasks > 0 ? 'var(--status-high)' : 'var(--status-complete)',
    },
  ];

  return (
    <div className="kpi-cards">
      {cards.map((card) => (
        <div key={card.title} className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-icon" style={{ backgroundColor: `${card.color}20` }}>
              {card.icon}
            </span>
            <span className={`kpi-trend ${card.trendUp ? 'up' : 'down'}`}>
              {card.trendUp ? '↑' : '↓'} {card.trend}
            </span>
          </div>
          <div className="kpi-value" style={{ color: card.color }}>{card.value}</div>
          <div className="kpi-title">{card.title}</div>
        </div>
      ))}
    </div>
  );
}
