'use client';

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';

interface Prospect {
  _id: string;
  title: string;
  company: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  facebookUrl?: string;
  githubRepo?: string;
  loomUrl?: string;
  industry?: string;
  location?: string;
  lastContacted?: string;
  notes?: string;
  stage: 'lead' | 'site_built' | 'outreach' | 'contacted' | 'follow_up' | 'negotiating' | 'closed_won' | 'closed_lost';
  urgency: 'fresh' | 'warm' | 'cold' | 'no_contact';
  order: number;
  createdAt: string;
  updatedAt?: string;
}

interface ProspectCardProps {
  prospect: Prospect;
  index: number;
  onEdit: (prospect: Prospect) => void;
  onDelete: (prospectId: string) => void;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (prospectId: string) => void;
}

const urgencyLabels = {
  fresh: 'Fresh',
  warm: 'Warm',
  cold: 'Cold',
  no_contact: 'No Contact',
};

function getDaysAgo(dateStr: string): number {
  const diffTime = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getUrgencyColor(urgency: Prospect['urgency']) {
  switch(urgency) {
    case 'fresh': return 'fresh';
    case 'warm': return 'warm';
    case 'cold': return 'cold';
    case 'no_contact': return 'no-contact';
    default: return 'no-contact';
  }
}

export function ProspectCard({ prospect, index, onEdit, onDelete, selectMode, isSelected, onToggleSelect }: ProspectCardProps) {
  const daysAgo = prospect.lastContacted ? getDaysAgo(prospect.lastContacted) : null;

  const handleClick = (e: React.MouseEvent) => {
    if (selectMode && onToggleSelect) {
      e.stopPropagation();
      onToggleSelect(prospect._id);
    } else {
      onEdit(prospect);
    }
  };

  return (
    <Draggable draggableId={prospect._id} index={index} isDragDisabled={selectMode}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={handleClick}
          className={`task-card ${snapshot.isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
        >
          {/* Selection Checkbox */}
          {selectMode && (
            <div 
              className={`task-select-checkbox ${isSelected ? 'checked' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.(prospect._id);
              }}
            >
              {isSelected && (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          )}

          {/* Header: Last Contacted + Urgency + Actions */}
          <div className="task-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {prospect.lastContacted && (
                <span className="task-date">
                  📅 {daysAgo} days ago
                </span>
              )}
              <span className={`priority-badge ${getUrgencyColor(prospect.urgency)}`}>
                <span className="priority-dot" />
                {urgencyLabels[prospect.urgency]}
              </span>
            </div>
            <div className="task-card-actions">
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(prospect._id); }}
                className="btn btn-ghost btn-icon"
                title="Delete"
                style={{ width: '24px', height: '24px' }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Title & Company */}
          <h4 className="task-card-title">{prospect.title}</h4>
          <div className="prospect-company">
            <p className="task-card-desc">{prospect.company}</p>
            {prospect.contactName && (
              <p className="prospect-contact-name">{prospect.contactName}</p>
            )}
            {prospect.location && (
              <p className="prospect-location">{prospect.location}</p>
            )}
          </div>

          {/* Notes Preview */}
          {prospect.notes && (
            <p className="task-card-desc">{prospect.notes.substring(0, 100)}{prospect.notes.length > 100 ? '...' : ''}</p>
          )}
          
          {/* Footer: Contact Methods + Industry */}
          <div className="task-card-footer">
            <div className="task-card-meta">
              {/* Contact Methods */}
              <div className="contact-methods">
                {prospect.phone && (
                  <a 
                    href={`tel:${prospect.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="contact-link"
                    title="Call"
                  >
                    📞
                  </a>
                )}
                {prospect.email && (
                  <a 
                    href={`mailto:${prospect.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="contact-link"
                    title="Email"
                  >
                    📧
                  </a>
                )}
                {prospect.website && (
                  <a 
                    href={prospect.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="contact-link"
                    title="Website"
                  >
                    🌐
                  </a>
                )}
                {prospect.githubRepo && (
                  <a 
                    href={`https://github.com/${prospect.githubRepo}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="contact-link"
                    title="GitHub"
                  >
                    💻
                  </a>
                )}
                {prospect.facebookUrl && (
                  <a 
                    href={prospect.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    className="contact-link"
                    title="Facebook"
                  >
                    📘
                  </a>
                )}
              </div>

              {/* Industry */}
              {prospect.industry && (
                <span className="task-meta-item project-tag" title={prospect.industry}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {prospect.industry}
                </span>
              )}
            </div>

            {/* Stage Indicator */}
            <div className="assignee-avatar pipeline" title={prospect.stage}>
              🎯
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}