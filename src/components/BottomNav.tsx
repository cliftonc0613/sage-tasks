'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  { id: 'board', label: 'Board', href: '/', icon: BoardIcon },
  { id: 'list', label: 'List', href: '/list', icon: ListIcon },
  { id: 'calendar', label: 'Calendar', href: '/calendar', icon: CalendarIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  
  const getActivePage = () => {
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname === '/list') return 'list';
    if (pathname === '/calendar') return 'calendar';
    return 'board';
  };
  
  const activePage = getActivePage();

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`bottom-nav-item ${activePage === item.id ? 'active' : ''}`}
        >
          <item.icon />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function DashboardIcon() {
  return (
    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
