'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { MobileHeader } from '@/components/MobileHeader';
import { KPICards } from '@/components/dashboard/KPICards';
import { ProjectChart } from '@/components/dashboard/ProjectChart';
import { TeamPerformance } from '@/components/dashboard/TeamPerformance';
import { ActivityLog } from '@/components/ActivityLog';
import { CommandPalette, useCommandPalette } from '@/components/CommandPalette';

export default function DashboardPage() {
  const tasks = useQuery(api.tasks.list);
  const stats = useQuery(api.tasks.stats);
  const { isOpen: commandOpen, setIsOpen: setCommandOpen } = useCommandPalette();

  if (tasks === undefined || stats === undefined) {
    return (
      <div className="app-container">
        <Sidebar activePage="dashboard" />
        <div className="main-content">
          <div className="loading">
            <div className="loading-spinner" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <MobileHeader title="Dashboard" onOpenCommandPalette={() => setCommandOpen(true)} />
      <Sidebar activePage="dashboard" />
      <div className="main-content">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-top">
            <div>
              <h1 className="dashboard-title">Dashboard</h1>
              <p className="dashboard-subtitle">Welcome back! Here's your project overview.</p>
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
        </header>

        {/* Dashboard Content */}
        <main className="dashboard-content">
          {/* KPI Cards */}
          <KPICards tasks={tasks} stats={stats} />

          {/* Main Grid */}
          <div className="dashboard-main-grid">
            {/* Left Column: Charts */}
            <div className="dashboard-charts">
              <ProjectChart tasks={tasks} />
              <TeamPerformance tasks={tasks} />
            </div>

            {/* Right Column: Activity */}
            <div className="dashboard-activity">
              <div className="activity-card">
                <div className="activity-card-header">
                  <h3>Recent Activity</h3>
                </div>
                <ActivityLog limit={10} compact />
              </div>
            </div>
          </div>
        </main>

        {/* Command Palette */}
        <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
      </div>
      <BottomNav />
    </div>
  );
}
