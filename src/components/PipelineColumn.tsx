'use client';

import { Droppable } from '@hello-pangea/dnd';
import { ProspectCard } from './ProspectCard';

interface PipelineColumn {
  id: string;
  title: string;
  color: string;
}

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

interface PipelineColumnProps {
  column: PipelineColumn;
  prospects: Prospect[];
  onAddProspect: (columnId: string) => void;
  onEditProspect: (prospect: Prospect) => void;
  onDeleteProspect: (prospectId: string) => void;
  selectMode?: boolean;
  selectedProspects?: Set<string>;
  onToggleSelect?: (prospectId: string) => void;
}

const stageConfig: Record<string, { icon: string; colorClass: string }> = {
  'lead': { icon: '🎯', colorClass: 'lead' },
  'site_built': { icon: '🎨', colorClass: 'site-built' },
  'outreach': { icon: '📞', colorClass: 'outreach' },
  'contacted': { icon: '✅', colorClass: 'contacted' },
  'follow_up': { icon: '📅', colorClass: 'follow-up' },
  'negotiating': { icon: '💰', colorClass: 'negotiating' },
  'closed_won': { icon: '🎉', colorClass: 'closed-won' },
  'closed_lost': { icon: '❌', colorClass: 'closed-lost' },
};

export function PipelineColumn({ 
  column, 
  prospects, 
  onAddProspect, 
  onEditProspect, 
  onDeleteProspect, 
  selectMode, 
  selectedProspects, 
  onToggleSelect 
}: PipelineColumnProps) {
  const config = stageConfig[column.id] || { icon: '🎯', colorClass: 'lead' };

  return (
    <div className="column">
      {/* Column Header */}
      <div className="column-header">
        <div className="column-title">
          <div className={`column-icon ${config.colorClass}`}>
            {config.icon}
          </div>
          <h3>{column.title}</h3>
          <span className="column-count">{prospects.length}</span>
        </div>
        <button
          onClick={() => onAddProspect(column.id)}
          className="btn btn-ghost btn-icon"
          title="Add prospect"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      
      {/* Droppable Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-content ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
          >
            {prospects.length === 0 && !snapshot.isDraggingOver && (
              <div className="column-empty">
                <div className="column-empty-icon">
                  {column.id === 'closed_won' ? '🎉' : column.id === 'closed_lost' ? '😞' : '📝'}
                </div>
                <span>No prospects</span>
              </div>
            )}
            {prospects.map((prospect, index) => (
              <ProspectCard
                key={prospect._id}
                prospect={prospect}
                index={index}
                onEdit={onEditProspect}
                onDelete={onDeleteProspect}
                selectMode={selectMode}
                isSelected={selectedProspects?.has(prospect._id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Column Footer - Add Prospect */}
      <div className="column-footer">
        <button
          onClick={() => onAddProspect(column.id)}
          className="add-task-btn"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Prospect
        </button>
      </div>
    </div>
  );
}