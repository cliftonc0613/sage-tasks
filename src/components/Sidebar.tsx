'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface SidebarProps {
  activePage: 'dashboard' | 'board' | 'calendar';
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  { id: 'board', label: 'Board', href: '/', icon: BoardIcon },
  { id: 'calendar', label: 'Calendar', href: '/calendar', icon: CalendarIcon },
];

const projectColors: Record<string, string> = {
  'AI Trade School': '#3b82f6',
  'AI Boardroom': '#8b5cf6',
  'CT Web Design Shop': '#ec4899',
  'CliftonAI YouTube Scripts': '#f59e0b',
  'Sage Tasks': '#22c55e',
  'Other': '#6b7280',
};

export function Sidebar({ activePage }: SidebarProps) {
  const tasks = useQuery(api.tasks.list);
  
  // Get unique projects from tasks
  const projects = tasks 
    ? [...new Set(tasks.filter(t => t.project).map(t => t.project!))]
    : [];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo">🌿</div>
        <div className="logo-text">
          <span className="logo-title">Sage Tasks</span>
          <span className="logo-subtitle">Project Management</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          <span className="nav-section-title">Menu</span>
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            >
              <item.icon />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Projects Section */}
        <div className="nav-section">
          <span className="nav-section-title">Projects</span>
          {projects.map((project) => (
            <div key={project} className="nav-item project-item">
              <span 
                className="project-dot" 
                style={{ backgroundColor: projectColors[project] || '#6b7280' }}
              />
              <span className="project-name">{project}</span>
              <span className="project-count">
                {tasks?.filter(t => t.project === project).length || 0}
              </span>
            </div>
          ))}
        </div>
      </nav>

      {/* User Section */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">C</div>
          <div className="user-details">
            <span className="user-name">Clifton</span>
            <span className="user-role">Owner</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DashboardIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
