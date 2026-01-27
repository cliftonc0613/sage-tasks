'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { MobileHeader } from '@/components/MobileHeader';
import { TaskModal } from '@/components/TaskModal';
import { CommandPalette, useCommandPalette } from '@/components/CommandPalette';
import { isDateOverdue } from '@/lib/date-utils';

export default function CalendarPage() {
  const tasks = useQuery(api.tasks.list);
  const updateTask = useMutation(api.tasks.update);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const { isOpen: commandOpen, setIsOpen: setCommandOpen } = useCommandPalette();

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const days = [];
    
    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false,
      });
    }
    
    // Current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return days;
  }, [currentDate]);

  const getTasksForDate = (date: Date) => {
    if (!tasks) return [];
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => task.dueDate === dateStr);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isOverdue = (task: any) => {
    if (!task.dueDate || task.status === 'done') return false;
    return isDateOverdue(task.dueDate);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (tasks === undefined) {
    return (
      <div className="app-container">
        <Sidebar activePage="calendar" />
        <div className="main-content">
          <div className="loading">
            <div className="loading-spinner" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="app-container">
      <MobileHeader title="Calendar" onOpenCommandPalette={() => setCommandOpen(true)} onAddTask={() => { setEditingTask(null); setIsModalOpen(true); }} />
      <Sidebar activePage="calendar" />
      <div className="main-content">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-top">
            <div>
              <h1 className="dashboard-title">Calendar</h1>
              <p className="dashboard-subtitle">View tasks by due date</p>
            </div>
            <div className="header-actions">
              <div className="calendar-nav">
                <button onClick={prevMonth}>← Prev</button>
                <span className="calendar-month">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={nextMonth}>Next →</button>
                <button onClick={goToToday}>Today</button>
              </div>
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
        </header>

        {/* Calendar Content */}
        <main className="dashboard-content">
          <div className="calendar-grid">
            {/* Week day headers */}
            {weekDays.map(day => (
              <div key={day} className="calendar-header">{day}</div>
            ))}
            
            {/* Calendar days */}
            {calendarData.map((day, index) => {
              const dayTasks = getTasksForDate(day.date);
              return (
                <div 
                  key={index} 
                  className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday(day.date) ? 'today' : ''}`}
                >
                  <div className="calendar-date">{day.date.getDate()}</div>
                  {dayTasks.slice(0, 3).map(task => (
                    <div 
                      key={task._id} 
                      className={`calendar-task ${task.priority} ${isOverdue(task) ? 'overdue-task' : ''}`}
                      onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                      title={task.title}
                    >
                      {task.recurring && '🔄 '}{task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="calendar-task" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              );
            })}
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
                id: taskData.id as Id<"tasks">,
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
      <BottomNav />
    </div>
  );
}
