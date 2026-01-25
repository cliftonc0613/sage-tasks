'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Sidebar } from '@/components/Sidebar';
import { TaskModal } from '@/components/TaskModal';

export default function CalendarPage() {
  const tasks = useQuery(api.tasks.list);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

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
      <Sidebar activePage="calendar" />
      <div className="main-content">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-top">
            <div>
              <h1 className="dashboard-title">Calendar</h1>
              <p className="dashboard-subtitle">View tasks by due date</p>
            </div>
            <div className="calendar-nav">
              <button onClick={prevMonth}>← Prev</button>
              <span className="calendar-month">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={nextMonth}>Next →</button>
              <button onClick={goToToday}>Today</button>
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
                      className={`calendar-task ${task.priority}`}
                      onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                      title={task.title}
                    >
                      {task.title}
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
          onSave={() => {}}
        />
      </div>
    </div>
  );
}
