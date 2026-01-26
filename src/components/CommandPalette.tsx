'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const projects = [
  'AI Trade School',
  'AI Boardroom',
  'CT Web Design Shop',
  'CliftonAI YouTube Scripts',
  'Sage Tasks',
  'my-prompt-library',
  'Prompt Library',
  'Other',
];

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const createTask = useMutation(api.tasks.create);
  const [input, setInput] = useState('');
  const [assignee, setAssignee] = useState<'clifton' | 'sage' | 'unassigned'>('unassigned');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [project, setProject] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setInput('');
      setAssignee('unassigned');
      setPriority('medium');
      setProject('');
      setShowOptions(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    // Parse smart syntax: "Task title @sage !high #Project"
    let title = input;
    let parsedAssignee = assignee;
    let parsedPriority = priority;
    let parsedProject = project;

    // Parse @mentions for assignee
    const assigneeMatch = input.match(/@(clifton|sage)/i);
    if (assigneeMatch) {
      parsedAssignee = assigneeMatch[1].toLowerCase() as 'clifton' | 'sage';
      title = title.replace(/@(clifton|sage)/i, '').trim();
    }

    // Parse !priority
    const priorityMatch = input.match(/!(high|medium|low)/i);
    if (priorityMatch) {
      parsedPriority = priorityMatch[1].toLowerCase() as 'low' | 'medium' | 'high';
      title = title.replace(/!(high|medium|low)/i, '').trim();
    }

    // Parse #project
    const projectMatch = input.match(/#(\S+)/);
    if (projectMatch) {
      const projectName = projectMatch[1].replace(/-/g, ' ');
      const matchedProject = projects.find(p => 
        p.toLowerCase().includes(projectName.toLowerCase())
      );
      if (matchedProject) {
        parsedProject = matchedProject;
      }
      title = title.replace(/#\S+/, '').trim();
    }

    await createTask({
      title: title.trim(),
      description: '',
      assignee: parsedAssignee,
      priority: parsedPriority,
      status: 'todo',
      project: parsedProject || undefined,
      subtasks: [],
      comments: [],
    });

    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      setShowOptions(!showOptions);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-header">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Quick add task... (⌘K)"
            className="command-input"
            autoComplete="off"
          />
          <div className="command-shortcuts">
            <span className="shortcut-hint">↵ Create</span>
            <span className="shortcut-hint">Tab Options</span>
            <span className="shortcut-hint">Esc Close</span>
          </div>
        </div>

        {showOptions && (
          <div className="command-options">
            <div className="command-option-group">
              <label>Assignee</label>
              <div className="command-option-buttons">
                <button
                  type="button"
                  className={`option-btn ${assignee === 'unassigned' ? 'active' : ''}`}
                  onClick={() => setAssignee('unassigned')}
                >
                  ? None
                </button>
                <button
                  type="button"
                  className={`option-btn ${assignee === 'clifton' ? 'active' : ''}`}
                  onClick={() => setAssignee('clifton')}
                >
                  👤 Clifton
                </button>
                <button
                  type="button"
                  className={`option-btn ${assignee === 'sage' ? 'active' : ''}`}
                  onClick={() => setAssignee('sage')}
                >
                  🌿 Sage
                </button>
              </div>
            </div>

            <div className="command-option-group">
              <label>Priority</label>
              <div className="command-option-buttons">
                <button
                  type="button"
                  className={`option-btn ${priority === 'low' ? 'active' : ''}`}
                  onClick={() => setPriority('low')}
                >
                  🟢 Low
                </button>
                <button
                  type="button"
                  className={`option-btn ${priority === 'medium' ? 'active' : ''}`}
                  onClick={() => setPriority('medium')}
                >
                  🟡 Medium
                </button>
                <button
                  type="button"
                  className={`option-btn ${priority === 'high' ? 'active' : ''}`}
                  onClick={() => setPriority('high')}
                >
                  🔴 High
                </button>
              </div>
            </div>

            <div className="command-option-group">
              <label>Project</label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="command-select"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="command-footer">
          <span className="syntax-hint">
            💡 Syntax: <code>Task name @sage !high #Project</code>
          </span>
        </div>
      </div>
    </div>
  );
}

// Hook to handle keyboard shortcut
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
}
