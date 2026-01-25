'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo, useState } from 'react';

interface Task {
  _id: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

interface ProjectChartProps {
  tasks: Task[];
}

export function ProjectChart({ tasks }: ProjectChartProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');

  const chartData = useMemo(() => {
    const days = timeRange === 'week' ? 7 : 30;
    const data = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const created = tasks.filter(t => {
        const taskDate = new Date(t.createdAt);
        return taskDate >= date && taskDate < nextDate;
      }).length;

      const completed = tasks.filter(t => {
        if (t.status !== 'done' || !t.updatedAt) return false;
        const taskDate = new Date(t.updatedAt);
        return taskDate >= date && taskDate < nextDate;
      }).length;

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        created,
        completed,
      });
    }

    return data;
  }, [tasks, timeRange]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Project Overview</h3>
          <p className="chart-subtitle">Tasks created vs completed over time</p>
        </div>
        <div className="chart-toggle">
          <button
            className={`toggle-btn ${timeRange === 'week' ? 'active' : ''}`}
            onClick={() => setTimeRange('week')}
          >
            Week
          </button>
          <button
            className={`toggle-btn ${timeRange === 'month' ? 'active' : ''}`}
            onClick={() => setTimeRange('month')}
          >
            Month
          </button>
        </div>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff6b5b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff6b5b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis 
              dataKey="date" 
              stroke="var(--text-muted)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="var(--text-muted)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-lg)',
              }}
              labelStyle={{ color: 'var(--text-primary)' }}
            />
            <Area
              type="monotone"
              dataKey="created"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCreated)"
              name="Created"
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke="#ff6b5b"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCompleted)"
              name="Completed"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#3b82f6' }} />
          <span>Tasks Created</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#ff6b5b' }} />
          <span>Tasks Completed</span>
        </div>
      </div>
    </div>
  );
}
