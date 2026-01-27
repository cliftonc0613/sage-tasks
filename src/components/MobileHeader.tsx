'use client';

import { useState } from 'react';

interface MobileHeaderProps {
  title?: string;
  showSearch?: boolean;
  onOpenCommandPalette?: () => void;
  onAddTask?: () => void;
}

export function MobileHeader({ title = 'Sage Tasks', showSearch = true, onOpenCommandPalette, onAddTask }: MobileHeaderProps) {
  return (
    <header className="mobile-header">
      <div className="mobile-header-left">
        <div className="mobile-logo">🌿</div>
        <span className="mobile-title">{title}</span>
      </div>
      <div className="mobile-header-actions">
        {showSearch && (
          <button 
            className="mobile-action-btn" 
            onClick={onOpenCommandPalette}
            aria-label="Search"
          >
            <SearchIcon />
          </button>
        )}
        <button 
          className="mobile-action-btn" 
          onClick={onAddTask}
          aria-label="Add task"
        >
          <PlusIcon />
        </button>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
