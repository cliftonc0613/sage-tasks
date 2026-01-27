'use client';

import { useState, useRef, useEffect } from 'react';

interface MobileHeaderProps {
  title?: string;
  showSearch?: boolean;
  onOpenCommandPalette?: () => void;
  onAddTask?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function MobileHeader({ 
  title = 'Sage Tasks', 
  showSearch = true, 
  onOpenCommandPalette,
  onAddTask,
  searchQuery = '',
  onSearchChange,
}: MobileHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearchToggle = () => {
    if (isSearchOpen) {
      // Closing search - clear the query
      onSearchChange?.('');
      setIsSearchOpen(false);
    } else {
      setIsSearchOpen(true);
    }
  };

  const handleSearchClear = () => {
    onSearchChange?.('');
    searchInputRef.current?.focus();
  };

  return (
    <header className="mobile-header">
      {isSearchOpen ? (
        // Search mode - full width search bar
        <div className="mobile-search-bar">
          <button 
            className="mobile-search-back"
            onClick={handleSearchToggle}
            aria-label="Close search"
          >
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search tasks..."
            className="mobile-search-input"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
          />
          {searchQuery && (
            <button 
              className="mobile-search-clear"
              onClick={handleSearchClear}
              aria-label="Clear search"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        // Normal header mode
        <>
          <div className="mobile-header-left">
            <div className="mobile-logo">🌿</div>
            <span className="mobile-title">{title}</span>
          </div>
          <div className="mobile-header-actions">
            {showSearch && onSearchChange && (
              <button 
                className="mobile-action-btn" 
                onClick={handleSearchToggle}
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
        </>
      )}
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
