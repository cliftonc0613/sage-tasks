'use client';

import { Task, Assignee, Subtask, Comment } from '@/types';
import { useState, useEffect } from 'react';
import { createSubtask, createComment } from '@/lib/store';

interface TaskModalProps {
  isOpen: boolean;
  task?: Task | null;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'createdAt'> & { id?: string }) => void;
}

const projects = [
  'AI Trade School',
  'AI Boardroom',
  'CT Web Design Shop',
  'Sage Tasks',
  'Other',
];

export function TaskModal({ isOpen, task, onClose, onSave }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState<Assignee>('unassigned');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [project, setProject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'comments'>('details');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setAssignee(task.assignee);
      setPriority(task.priority);
      setProject(task.project || '');
      setDueDate(task.dueDate || '');
      setSubtasks(task.subtasks || []);
      setComments(task.comments || []);
    } else {
      setTitle('');
      setDescription('');
      setAssignee('unassigned');
      setPriority('medium');
      setProject('');
      setDueDate('');
      setSubtasks([]);
      setComments([]);
    }
    setActiveTab('details');
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: task?.id,
      title,
      description,
      assignee,
      priority,
      project: project || undefined,
      dueDate: dueDate || undefined,
      subtasks,
      comments,
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

  const addComment = () => {
    if (newComment.trim()) {
      setComments([...comments, createComment(newComment.trim(), 'clifton')]);
      setNewComment('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl shadow-2xl w-full max-w-lg border border-white/10 animate-fadeIn">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-100">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-200 p-1 hover:bg-white/5 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {(['details', 'subtasks', 'comments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab 
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'details' && '📝 Details'}
              {tab === 'subtasks' && `✅ Subtasks (${subtasks.length})`}
              {tab === 'comments' && `💬 Comments (${comments.length})`}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 max-h-[400px] overflow-y-auto">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full input-dark"
                    placeholder="Task title..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full input-dark resize-none"
                    placeholder="Task description..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Assign To
                    </label>
                    <select
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value as Assignee)}
                      className="w-full input-dark"
                    >
                      <option value="unassigned">Unassigned</option>
                      <option value="clifton">👤 Clifton</option>
                      <option value="sage">🌿 Sage</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Task['priority'])}
                      className="w-full input-dark"
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🔴 High</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Project
                    </label>
                    <select
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      className="w-full input-dark"
                    >
                      <option value="">No project</option>
                      {projects.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full input-dark"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Subtasks Tab */}
            {activeTab === 'subtasks' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                    className="flex-1 input-dark"
                    placeholder="Add a subtask..."
                  />
                  <button
                    type="button"
                    onClick={addSubtask}
                    className="btn-primary px-4"
                  >
                    Add
                  </button>
                </div>

                {subtasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>No subtasks yet</p>
                    <p className="text-sm">Break down this task into smaller steps</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-white/5 group"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSubtask(subtask.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            subtask.completed 
                              ? 'bg-cyan-500 border-cyan-500' 
                              : 'border-slate-500 hover:border-cyan-400'
                          }`}
                        >
                          {subtask.completed && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span className={`flex-1 text-sm ${subtask.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                          {subtask.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSubtask(subtask.id)}
                          className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addComment())}
                    className="flex-1 input-dark"
                    placeholder="Add a comment..."
                  />
                  <button
                    type="button"
                    onClick={addComment}
                    className="btn-primary px-4"
                  >
                    Post
                  </button>
                </div>

                {comments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>No comments yet</p>
                    <p className="text-sm">Start a discussion about this task</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="p-3 rounded-lg bg-white/5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${
                            comment.author === 'sage' ? 'text-emerald-400' : 'text-cyan-400'
                          }`}>
                            {comment.author === 'sage' ? '🌿 Sage' : '👤 Clifton'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-slate-300 bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary py-2.5"
            >
              {task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
