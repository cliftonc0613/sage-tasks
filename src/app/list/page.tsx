'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Sidebar } from '@/components/Sidebar';
import { TaskModal } from '@/components/TaskModal';
import { CommandPalette, useCommandPalette } from '@/components/CommandPalette';

export default function ListPage() {
  const tasks = useQuery(api.tasks.list);
  const updateTask = useMutation(api.tasks.update);
  const bulkUpdate = useMutation(api.tasks.bulkUpdate);
  const bulkDelete = useMutation(api.tasks.bulkDelete);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  const { isOpen: commandOpen, setIsOpen: setCommandOpen } = useCommandPalette();

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(task => {
      const matchesSearch = !searchQuery || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.project?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesAssignee = filterAssignee === 'all' || task.assignee === filterAssignee;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchQuery, filterStatus, filterPriority, filterAssignee]);

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

  const formatTimeEstimate = (minutes?: number) => {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await updateTask({
      id: taskId as Id<"tasks">,
      status: newStatus as any,
    });
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const toggleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t._id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    await bulkUpdate({
      ids: Array.from(selectedTasks) as Id<"tasks">[],
      status: newStatus as any,
    });
    setSelectedTasks(new Set());
    setShowBulkActions(false);
  };

  const handleBulkAssigneeChange = async (newAssignee: string) => {
    await bulkUpdate({
      ids: Array.from(selectedTasks) as Id<"tasks">[],
      assignee: newAssignee as any,
    });
    setSelectedTasks(new Set());
    setShowBulkActions(false);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTasks.size} tasks? This cannot be undone.`)) return;
    await bulkDelete({
      ids: Array.from(selectedTasks) as Id<"tasks">[],
    });
    setSelectedTasks(new Set());
    setShowBulkActions(false);
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Description', 'Status', 'Priority', 'Assignee', 'Project', 'Due Date', 'Time Estimate (mins)', 'Subtasks', 'Created'];
    const rows = filteredTasks.map(task => [
      task.title,
      task.description || '',
      task.status,
      task.priority,
      task.assignee,
      task.project || '',
      task.dueDate || '',
      task.timeEstimate?.toString() || '',
      `${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length}`,
      task.createdAt,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sage-tasks-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
            <div className="header-actions">
              <button
                className="btn btn-secondary"
                onClick={exportToCSV}
                title="Export to CSV"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setCommandOpen(true)}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Task
                <span className="shortcut-badge">⌘K</span>
              </button>
            </div>
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
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Assignees</option>
              <option value="clifton">👤 Clifton</option>
              <option value="sage">🌿 Sage</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          {/* Bulk Actions Bar */}
          {showBulkActions && (
            <div className="bulk-actions-bar">
              <span className="bulk-count">{selectedTasks.size} selected</span>
              <div className="bulk-buttons">
                <select
                  onChange={(e) => { if (e.target.value) handleBulkStatusChange(e.target.value); e.target.value = ''; }}
                  className="filter-select"
                  defaultValue=""
                >
                  <option value="" disabled>Move to...</option>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
                <select
                  onChange={(e) => { if (e.target.value) handleBulkAssigneeChange(e.target.value); e.target.value = ''; }}
                  className="filter-select"
                  defaultValue=""
                >
                  <option value="" disabled>Assign to...</option>
                  <option value="clifton">👤 Clifton</option>
                  <option value="sage">🌿 Sage</option>
                  <option value="unassigned">Unassigned</option>
                </select>
                <button
                  className="btn btn-secondary btn-danger"
                  onClick={handleBulkDelete}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => { setSelectedTasks(new Set()); setShowBulkActions(false); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </header>

        {/* List Content */}
        <main className="dashboard-content">
          <div className="table-card">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                        onChange={toggleSelectAll}
                        className="table-checkbox"
                      />
                    </th>
                    <th style={{ width: '35%' }}>Task</th>
                    <th>Project</th>
                    <th>Assignee</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-row">
                        No tasks found
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                      <tr 
                        key={task._id} 
                        className={`${selectedTasks.has(task._id) ? 'selected' : ''} ${isOverdue(task) ? 'overdue-row' : ''}`}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedTasks.has(task._id)}
                            onChange={() => toggleTaskSelection(task._id)}
                            className="table-checkbox"
                          />
                        </td>
                        <td 
                          className="task-cell"
                          onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                          style={{ cursor: 'pointer' }}
                        >
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
                        <td className="time-cell">
                          {formatTimeEstimate(task.timeEstimate)}
                        </td>
                        <td className={isOverdue(task) ? 'overdue' : ''}>
                          {formatDate(task.dueDate)}
                          {isOverdue(task) && <span className="overdue-badge">Overdue</span>}
                          {task.recurring && <span className="recurring-indicator">🔄</span>}
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
                {selectedTasks.size > 0 && ` • ${selectedTasks.size} selected`}
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
                timeEstimate: taskData.timeEstimate,
                subtasks: taskData.subtasks,
                comments: taskData.comments,
                recurring: taskData.recurring,
              });
            }
          }}
        />

        {/* Command Palette */}
        <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
      </div>
    </div>
  );
}
