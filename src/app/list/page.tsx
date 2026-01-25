'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Sidebar } from '@/components/Sidebar';
import { TaskModal } from '@/components/TaskModal';

export default function ListPage() {
  const tasks = useQuery(api.tasks.list);
  const updateTask = useMutation(api.tasks.update);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  if (tasks === undefined) {
    return (
      <div className="app-container">
        <Sidebar activePage="board" />
        <div className="main-content">
          <div className="loading">
            <div className="loading-spinner" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.project?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const isOverdue = (task: any) => {
    if (!task.dueDate || task.status === 'done') return false;
    const due = new Date(task.dueDate);
    due.setHours(23, 59, 59, 999);
    return due < new Date();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await updateTask({
      id: taskId as Id<"tasks">,
      status: newStatus as any,
    });
  };

  return (
    <div className="app-container">
      <Sidebar activePage="board" />
      <div className="main-content">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-top">
            <div>
              <h1 className="dashboard-title">List View</h1>
              <p className="dashboard-subtitle">All tasks in a table format</p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Task
            </button>
          </div>

          {/* Filters */}
          <div className="list-filters">
            <div className="search-input" style={{ flex: 1, maxWidth: '300px' }}>
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
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Priority</option>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
        </header>

        {/* List Content */}
        <main className="dashboard-content">
          <div className="table-card">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Task</th>
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
                    filteredTasks.map((task) => (
                      <tr 
                        key={task._id} 
                        onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="task-cell">
                          <span className="task-title">{task.title}</span>
                          {task.subtasks.length > 0 && (
                            <span className="subtask-indicator">
                              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks
                            </span>
                          )}
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
                          <select
                            value={task.status}
                            onChange={(e) => { e.stopPropagation(); handleStatusChange(task._id, e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            className={`status-select ${task.status}`}
                          >
                            <option value="todo">To Do</option>
                            <option value="in-progress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="done">Done</option>
                          </select>
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
            <div className="table-footer">
              <span className="table-count">
                Showing {filteredTasks.length} of {tasks.length} tasks
              </span>
            </div>
          </div>
        </main>

        {/* Modal */}
        <TaskModal
          isOpen={isModalOpen}
          task={editingTask}
          onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
          onSave={async (taskData: any) => {
            if (taskData.id) {
              await updateTask({
                id: taskData.id,
                title: taskData.title,
                description: taskData.description,
                assignee: taskData.assignee,
                priority: taskData.priority,
                project: taskData.project,
                dueDate: taskData.dueDate,
                subtasks: taskData.subtasks,
                comments: taskData.comments,
              });
            }
          }}
        />
      </div>
    </div>
  );
}
