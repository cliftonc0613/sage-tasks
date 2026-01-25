'use client';

import { useState } from 'react';

interface Task {
  _id: string;
  title: string;
  assignee: "clifton" | "sage" | "unassigned";
  priority: "low" | "medium" | "high";
  status: string;
  project?: string;
  dueDate?: string;
}

interface TeamPerformanceProps {
  tasks: Task[];
}

export function TeamPerformance({ tasks }: TeamPerformanceProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.assignee.toLowerCase().includes(query) ||
      task.project?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'done') return false;
    const due = new Date(task.dueDate);
    due.setHours(23, 59, 59, 999);
    return due < new Date();
  };

  return (
    <div className="table-card">
      <div className="table-header">
        <div>
          <h3 className="table-title">Task Overview</h3>
          <p className="table-subtitle">All tasks across projects</p>
        </div>
        <div className="table-actions">
          <div className="search-input">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Project</th>
              <th>Assignee</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-row">
                  No tasks found
                </td>
              </tr>
            ) : (
              filteredTasks.slice(0, 10).map((task) => (
                <tr key={task._id}>
                  <td className="task-cell">
                    <span className="task-title">{task.title}</span>
                  </td>
                  <td>
                    <span className="project-badge">{task.project || '—'}</span>
                  </td>
                  <td>
                    <div className="assignee-cell">
                      <div className={`assignee-avatar small ${task.assignee}`}>
                        {task.assignee === 'sage' ? '🌿' : task.assignee === 'clifton' ? 'C' : '?'}
                      </div>
                      <span>{task.assignee === 'unassigned' ? 'Unassigned' : task.assignee}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`priority-badge ${task.priority}`}>
                      <span className="priority-dot" />
                      {task.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${task.status}`}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className={isOverdue(task) ? 'overdue' : ''}>
                    {formatDate(task.dueDate)}
                    {isOverdue(task) && <span className="overdue-badge">Overdue</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredTasks.length > 10 && (
        <div className="table-footer">
          <span className="table-count">
            Showing 10 of {filteredTasks.length} tasks
          </span>
        </div>
      )}
    </div>
  );
}
