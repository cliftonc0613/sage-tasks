'use client';

interface Task {
  _id: string;
  status: string;
  dueDate?: string;
  createdAt: string;
}

interface KPICardsProps {
  tasks: Task[];
}

export function KPICards({ tasks }: KPICardsProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }).length;

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
      trend: `${totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(0) : 0}%`,
      trendUp: true,
      icon: '✅',
      color: 'var(--status-complete)',
    },
    {
      title: 'In Progress',
      value: pendingTasks,
      trend: 'Active',
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
