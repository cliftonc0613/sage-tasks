'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

// Debounce hook for auto-save
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Comment {
  id: string;
  author: "clifton" | "sage" | "system";
  content: string;
  createdAt: string;
  mentions?: string[];
}

interface RecurringConfig {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  nextDue?: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  assignee: "clifton" | "sage" | "unassigned";
  priority: "low" | "medium" | "high";
  status: string;
  project?: string;
  dueDate?: string;
  timeEstimate?: number;
  subtasks: Subtask[];
  comments: Comment[];
  recurring?: RecurringConfig;
}

interface TaskModalProps {
  isOpen: boolean;
  task?: Task | null;
  onClose: () => void;
  onSave: (task: {
    id?: string;
    title: string;
    description: string;
    assignee: "clifton" | "sage" | "unassigned";
    priority: "low" | "medium" | "high";
    project?: string;
    dueDate?: string;
    timeEstimate?: number;
    subtasks: Subtask[];
    comments: Comment[];
    recurring?: RecurringConfig;
  }) => void;
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

function createSubtask(title: string): Subtask {
  return {
    id: crypto.randomUUID(),
    title,
    completed: false,
  };
}

function createComment(content: string, author: "clifton" | "sage"): Comment {
  // Parse @mentions
  const mentionRegex = /@(clifton|sage)/gi;
  const mentions = [...content.matchAll(mentionRegex)].map(m => m[1].toLowerCase());
  
  return {
    id: crypto.randomUUID(),
    author,
    content,
    createdAt: new Date().toISOString(),
    mentions: mentions.length > 0 ? mentions : undefined,
  };
}

function formatTimeEstimate(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function renderCommentContent(content: string): React.ReactNode {
  // Highlight @mentions
  const parts = content.split(/(@(?:clifton|sage))/gi);
  return (
    <>
      {parts.map((part, i) => {
        if (part.toLowerCase() === '@clifton') {
          return <span key={i} className="mention mention-clifton">@Clifton</span>;
        }
        if (part.toLowerCase() === '@sage') {
          return <span key={i} className="mention mention-sage">@Sage</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function TaskModal({ isOpen, task, onClose, onSave }: TaskModalProps) {
  const addCommentMutation = useMutation(api.tasks.addComment);
  const updateTaskMutation = useMutation(api.tasks.update);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState<"clifton" | "sage" | "unassigned">('unassigned');
  const [priority, setPriority] = useState<"low" | "medium" | "high">('medium');
  const [project, setProject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [timeEstimate, setTimeEstimate] = useState<number | undefined>(undefined);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [recurring, setRecurring] = useState<RecurringConfig | undefined>(undefined);
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'comments'>('details');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const isInitialLoad = useRef(true);

  // Track the last saved data to avoid unnecessary saves
  const lastSavedDataRef = useRef<string | null>(null);
  
  // Create a data object for auto-save
  const taskData = {
    title,
    description,
    assignee,
    priority,
    project: project || undefined,
    dueDate: dueDate || undefined,
    timeEstimate: timeEstimate || undefined,
    subtasks,
    recurring: isRecurring ? recurring : undefined,
  };
  
  // Debounce the task data for auto-save (1.5 second delay)
  const debouncedTaskData = useDebounce(JSON.stringify(taskData), 1500);

  // Auto-save effect for existing tasks
  useEffect(() => {
    // Only save for existing tasks when modal is open
    if (!task?._id || !isOpen) return;
    
    // Skip if this is the initial load (data matches what we just loaded)
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      lastSavedDataRef.current = debouncedTaskData;
      return;
    }
    
    // Skip if nothing has changed since last save
    if (lastSavedDataRef.current === debouncedTaskData) {
      return;
    }
    
    // Parse the debounced data to ensure we save exactly what was debounced
    const dataToSave = JSON.parse(debouncedTaskData);
    
    const saveTask = async () => {
      setIsSaving(true);
      try {
        await updateTaskMutation({
          id: task._id as Id<"tasks">,
          title: dataToSave.title,
          description: dataToSave.description,
          assignee: dataToSave.assignee,
          priority: dataToSave.priority,
          project: dataToSave.project,
          dueDate: dataToSave.dueDate,
          timeEstimate: dataToSave.timeEstimate,
          subtasks: dataToSave.subtasks,
          recurring: dataToSave.recurring,
        });
        lastSavedDataRef.current = debouncedTaskData;
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    };
    
    saveTask();
  }, [debouncedTaskData, task?._id, isOpen, updateTaskMutation]);

  useEffect(() => {
    // Reset initial load flag and last saved data when task changes
    isInitialLoad.current = true;
    lastSavedDataRef.current = null;
    
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setAssignee(task.assignee);
      setPriority(task.priority);
      setProject(task.project || '');
      setDueDate(task.dueDate || '');
      setTimeEstimate(task.timeEstimate);
      setSubtasks(task.subtasks || []);
      setComments(task.comments || []);
      setRecurring(task.recurring);
      setIsRecurring(!!task.recurring);
    } else {
      setTitle('');
      setDescription('');
      setAssignee('unassigned');
      setPriority('medium');
      setProject('');
      setDueDate('');
      setTimeEstimate(undefined);
      setSubtasks([]);
      setComments([]);
      setRecurring(undefined);
      setIsRecurring(false);
    }
    setActiveTab('details');
    setLastSaved(null);
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: task?._id,
      title,
      description,
      assignee,
      priority,
      project: project || undefined,
      dueDate: dueDate || undefined,
      timeEstimate: timeEstimate || undefined,
      subtasks,
      comments,
      recurring: isRecurring ? recurring : undefined,
    });
    onClose();
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, createSubtask(newSubtask.trim())]);
      setNewSubtask('');
    }
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(subtasks.map(s => 
      s.id === id ? { ...s, completed: !s.completed } : s
    ));
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const addComment = async () => {
    if (newComment.trim()) {
      const commentContent = newComment.trim();
      
      // If editing an existing task, save comment immediately to database
      if (task?._id) {
        await addCommentMutation({
          taskId: task._id as Id<"tasks">,
          author: 'clifton',
          content: commentContent,
        });
        // Add to local state for immediate UI update
        setComments([...comments, createComment(commentContent, 'clifton')]);
      } else {
        // For new tasks, just add to local state (will be saved with task)
        setComments([...comments, createComment(commentContent, 'clifton')]);
      }
      setNewComment('');
    }
  };

  const timePresets = [15, 30, 60, 120, 240, 480];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '65%',
          height: '75vh',
          maxWidth: '1200px',
          minWidth: '600px'
        }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 className="modal-title">
              {task ? 'Edit Task' : 'New Task'}
            </h2>
            {task && (
              <span style={{ 
                fontSize: '12px', 
                color: isSaving ? 'var(--accent)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {isSaving ? (
                  <>
                    <span className="loading-spinner" style={{ width: '12px', height: '12px' }} />
                    Saving...
                  </>
                ) : lastSaved ? (
                  <>✓ Auto-saved</>
                ) : (
                  <>Auto-save on</>
                )}
              </span>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="btn btn-ghost btn-icon"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            onClick={() => setActiveTab('details')}
            className={`modal-tab ${activeTab === 'details' ? 'active' : ''}`}
          >
            📝 Details
          </button>
          <button
            onClick={() => setActiveTab('subtasks')}
            className={`modal-tab ${activeTab === 'subtasks' ? 'active' : ''}`}
          >
            ✅ Subtasks ({subtasks.length})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`modal-tab ${activeTab === 'comments' ? 'active' : ''}`}
          >
            💬 Comments ({comments.length})
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input"
                    placeholder="Task title..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input"
                    placeholder="Task description..."
                    rows={3}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Assign To</label>
                    <select
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value as typeof assignee)}
                      className="input"
                    >
                      <option value="unassigned">Unassigned</option>
                      <option value="clifton">👤 Clifton</option>
                      <option value="sage">🌿 Sage</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as typeof priority)}
                      className="input"
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🔴 High</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Project</label>
                    <select
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      className="input"
                    >
                      <option value="">No project</option>
                      {projects.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>

                {/* Time Estimate */}
                <div className="form-group">
                  <label className="form-label">Time Estimate</label>
                  <div className="time-estimate-row">
                    <div className="time-presets">
                      {timePresets.map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          className={`time-preset-btn ${timeEstimate === mins ? 'active' : ''}`}
                          onClick={() => setTimeEstimate(mins)}
                        >
                          {formatTimeEstimate(mins)}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={timeEstimate || ''}
                      onChange={(e) => setTimeEstimate(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="input time-input"
                      placeholder="mins"
                      min="1"
                    />
                    {timeEstimate && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => setTimeEstimate(undefined)}
                        title="Clear"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Recurring Toggle */}
                <div className="form-group">
                  <label className="form-label recurring-label">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => {
                        setIsRecurring(e.target.checked);
                        if (e.target.checked && !recurring) {
                          setRecurring({ frequency: 'weekly', interval: 1 });
                        }
                      }}
                    />
                    🔄 Recurring Task
                  </label>
                  
                  {isRecurring && (
                    <div className="recurring-options">
                      <span>Repeat every</span>
                      <input
                        type="number"
                        value={recurring?.interval || 1}
                        onChange={(e) => setRecurring(prev => ({ 
                          ...prev!, 
                          interval: parseInt(e.target.value) || 1 
                        }))}
                        className="input recurring-interval"
                        min="1"
                      />
                      <select
                        value={recurring?.frequency || 'weekly'}
                        onChange={(e) => setRecurring(prev => ({ 
                          ...prev!, 
                          frequency: e.target.value as 'daily' | 'weekly' | 'monthly' 
                        }))}
                        className="input recurring-frequency"
                      >
                        <option value="daily">day(s)</option>
                        <option value="weekly">week(s)</option>
                        <option value="monthly">month(s)</option>
                      </select>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Subtasks Tab */}
            {activeTab === 'subtasks' && (
              <>
                <div className="add-input-row">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                    className="input"
                    placeholder="Add a subtask..."
                  />
                  <button
                    type="button"
                    onClick={addSubtask}
                    className="btn btn-primary"
                  >
                    Add
                  </button>
                </div>

                {subtasks.length === 0 ? (
                  <div className="empty-state">
                    <p>No subtasks yet</p>
                    <p>Break down this task into smaller steps</p>
                  </div>
                ) : (
                  <div className="subtask-list">
                    {subtasks.map((subtask) => (
                      <div key={subtask.id} className="subtask-item">
                        <button
                          type="button"
                          onClick={() => toggleSubtask(subtask.id)}
                          className={`subtask-checkbox ${subtask.completed ? 'checked' : ''}`}
                        >
                          {subtask.completed && (
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span className={`subtask-title ${subtask.completed ? 'completed' : ''}`}>
                          {subtask.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSubtask(subtask.id)}
                          className="btn btn-ghost btn-icon subtask-delete"
                          style={{ width: '24px', height: '24px' }}
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <>
                <div className="add-input-row">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addComment())}
                    className="input"
                    placeholder="Add a comment... (use @sage or @clifton to mention)"
                  />
                  <button
                    type="button"
                    onClick={addComment}
                    className="btn btn-primary"
                  >
                    Post
                  </button>
                </div>

                {comments.length === 0 ? (
                  <div className="empty-state">
                    <p>No comments yet</p>
                    <p>Start a discussion about this task</p>
                  </div>
                ) : (
                  <div className="comment-list">
                    {comments.map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-header">
                          <span className={`comment-author ${comment.author}`}>
                            {comment.author === 'sage' ? '🌿 Sage' : comment.author === 'system' ? '🤖 System' : '👤 Clifton'}
                          </span>
                          <span className="comment-date">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="comment-content">
                          {renderCommentContent(comment.content)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              {task ? 'Close' : 'Cancel'}
            </button>
            {!task && (
              <button
                type="submit"
                className="btn btn-primary"
              >
                Create Task
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
