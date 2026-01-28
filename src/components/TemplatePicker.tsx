'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface TemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TemplatePicker({ isOpen, onClose }: TemplatePickerProps) {
  const templates = useQuery(api.templates.list);
  const createFromTemplate = useMutation(api.templates.createTaskFromTemplate);
  
  const [selectedTemplate, setSelectedTemplate] = useState<Id<"templates"> | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [assignee, setAssignee] = useState<'clifton' | 'sage' | 'unassigned'>('unassigned');
  const [step, setStep] = useState<'select' | 'configure'>('select');
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedTemplate(null);
      setTaskTitle('');
      setAssignee('unassigned');
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'configure' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  const selectedTemplateData = templates?.find(t => t._id === selectedTemplate);

  const handleSelectTemplate = (templateId: Id<"templates">) => {
    setSelectedTemplate(templateId);
    const template = templates?.find(t => t._id === templateId);
    if (template) {
      setTaskTitle(template.name);
    }
    setStep('configure');
  };

  const handleCreate = async () => {
    if (!selectedTemplate || !taskTitle.trim()) return;

    await createFromTemplate({
      templateId: selectedTemplate,
      title: taskTitle.trim(),
      assignee,
      status: 'todo',
    });

    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (step === 'configure') {
        setStep('select');
      } else {
        onClose();
      }
    }
    if (e.key === 'Enter' && step === 'configure') {
      e.preventDefault();
      handleCreate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-overlay" onClick={onClose}>
      <div className="command-palette template-picker" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="command-header">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="command-title">
            {step === 'select' ? 'Create from Template' : 'Configure Task'}
          </span>
          <div className="command-shortcuts">
            <span className="shortcut-hint">Esc {step === 'configure' ? 'Back' : 'Close'}</span>
          </div>
        </div>

        {step === 'select' && (
          <div className="template-list">
            {!templates ? (
              <div className="template-loading">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="template-empty">
                <p>No templates yet.</p>
                <p className="template-hint">Run the seed function to create default templates.</p>
              </div>
            ) : (
              templates.map((template) => (
                <button
                  key={template._id}
                  className="template-item"
                  onClick={() => handleSelectTemplate(template._id)}
                >
                  <div className="template-item-header">
                    <span className="template-name">{template.name}</span>
                    <span className={`priority-badge priority-${template.defaultPriority}`}>
                      {template.defaultPriority}
                    </span>
                  </div>
                  <p className="template-description">{template.description}</p>
                  <div className="template-subtasks-preview">
                    <span className="subtask-count">{template.subtasks.length} subtasks</span>
                    {template.defaultProject && (
                      <span className="template-project">📁 {template.defaultProject}</span>
                    )}
                    {(template as any).totalEstimatedDays && (
                      <span className="template-duration">📅 ~{(template as any).totalEstimatedDays} days</span>
                    )}
                    {(template as any).category && (
                      <span className="template-category">🏷️ {(template as any).category}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {step === 'configure' && selectedTemplateData && (
          <div className="template-configure">
            <div className="command-option-group">
              <label>Task Title</label>
              <input
                ref={inputRef}
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="command-input template-title-input"
                placeholder="Enter task title..."
              />
            </div>

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

            <div className="template-preview">
              <label>
                Subtasks ({selectedTemplateData.subtasks.length})
                {(selectedTemplateData as any).totalEstimatedDays && (
                  <span className="template-total-days"> • ~{(selectedTemplateData as any).totalEstimatedDays} days total</span>
                )}
              </label>
              <ul className="subtask-preview-list">
                {((selectedTemplateData as any).subtasksEnhanced || selectedTemplateData.subtasks.map((s: string) => ({ title: s }))).map((subtask: any, i: number) => (
                  <li key={i} className="subtask-preview-item">
                    <span className="subtask-checkbox">○</span>
                    <span className="subtask-title">{subtask.title || subtask}</span>
                    {subtask.timeEstimate && (
                      <span className="subtask-estimate">⏱️ {Math.round(subtask.timeEstimate / 60)}h</span>
                    )}
                    {subtask.phase && (
                      <span className="subtask-phase">{subtask.phase}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="template-actions">
              <button className="btn-secondary" onClick={() => setStep('select')}>
                ← Back
              </button>
              <button 
                className="btn-primary" 
                onClick={handleCreate}
                disabled={!taskTitle.trim()}
              >
                Create Task
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
