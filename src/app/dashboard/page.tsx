'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Sidebar } from '@/components/Sidebar';
import { KPICards } from '@/components/dashboard/KPICards';
import { ProjectChart } from '@/components/dashboard/ProjectChart';
import { TeamPerformance } from '@/components/dashboard/TeamPerformance';

export default function DashboardPage() {
  const tasks = useQuery(api.tasks.list);

  if (tasks === undefined) {
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
      <Sidebar activePage="dashboard" />
      <div className="main-content">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-top">
            <div>
              <h1 className="dashboard-title">Dashboard</h1>
              <p className="dashboard-subtitle">Welcome back! Here's your project overview.</p>
            </div>
            <button className="btn btn-primary">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="dashboard-content">
          {/* KPI Cards */}
          <KPICards tasks={tasks} />

          {/* Charts Section */}
          <div className="dashboard-grid">
            <ProjectChart tasks={tasks} />
          </div>

          {/* Team Performance Table */}
          <TeamPerformance tasks={tasks} />
        </main>
      </div>
    </div>
  );
}
