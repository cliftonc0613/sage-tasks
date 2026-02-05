'use client';

import { useState } from 'react';
import { DragDropContext, DropResult, Droppable, Draggable } from '@hello-pangea/dnd';

// Simple prospect type
type Prospect = {
  id: string;
  title: string;
  company: string;
  stage: string;
};

// Sample data
const initialProspects: Prospect[] = [
  { id: '1', title: 'Henderson Plumbing Website', company: 'Henderson Plumbing', stage: 'closed_won' },
  { id: '2', title: 'Kicking Tree Lawn Care', company: 'Kicking Tree LLC', stage: 'closed_won' },
  { id: '3', title: 'New Heights Tree Service', company: 'New Heights Tree Service', stage: 'negotiating' },
  { id: '4', title: 'Blue Ridge Painting', company: 'Blue Ridge Painting Co', stage: 'follow_up' },
];

const stages = [
  { id: 'lead', title: 'Lead' },
  { id: 'site_built', title: 'Site Built' },
  { id: 'outreach', title: 'Outreach' },
  { id: 'contacted', title: 'Contacted' },
  { id: 'follow_up', title: 'Follow Up' },
  { id: 'negotiating', title: 'Negotiating' },
  { id: 'closed_won', title: 'Closed Won' },
  { id: 'closed_lost', title: 'Closed Lost' }
];

export default function PipelinePage() {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    
    setProspects(prev => prev.map(prospect => 
      prospect.id === draggableId 
        ? { ...prospect, stage: destination.droppableId }
        : prospect
    ));
  };

  const getProspectsForStage = (stageId: string) => {
    return prospects.filter(p => p.stage === stageId);
  };

  return (
    <div className="app-container">
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-top">
            <div className="header-title">
              <div className="logo">🎯</div>
              <div>
                <h1>Sales Pipeline</h1>
                <p className="header-subtitle">Prospect Management</p>
              </div>
            </div>
            <div className="header-actions">
              <button className="btn btn-primary">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Prospect
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="stats-bar">
            <div className="stat-item">
              <div className="stat-value">{prospects.length}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value" style={{ color: 'var(--status-complete)' }}>{prospects.filter(p => p.stage === 'closed_won').length}</div>
              <div className="stat-label">✅ Won</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#dc2626' }}>{prospects.filter(p => p.stage === 'closed_lost').length}</div>
              <div className="stat-label">❌ Lost</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="nav-tabs">
            <button className="nav-tab active">Pipeline</button>
            <button className="nav-tab">Tasks</button>
          </div>
        </header>

        {/* Pipeline Board */}
        <div className="board-container">
          <main className="board">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="board-columns">
                {stages.map(stage => {
                  const stageProspects = getProspectsForStage(stage.id);
                  
                  return (
                    <div key={stage.id} className="column">
                      {/* Column Header */}
                      <div className="column-header">
                        <div className="column-title">
                          <div className="column-icon" />
                          <h3>{stage.title}</h3>
                          <span className="column-count">{stageProspects.length}</span>
                        </div>
                        <button className="btn btn-ghost btn-icon" title="Add prospect">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Droppable Area */}
                      <Droppable droppableId={stage.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`column-content ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                          >
                            {stageProspects.length === 0 && !snapshot.isDraggingOver && (
                              <div className="column-empty">
                                <div className="column-empty-icon">📝</div>
                                <span>No prospects</span>
                              </div>
                            )}
                            {stageProspects.map((prospect, index) => (
                              <Draggable key={prospect.id} draggableId={prospect.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
                                  >
                                    <h4 className="task-card-title">{prospect.title}</h4>
                                    <p className="task-card-desc">{prospect.company}</p>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>

                      {/* Column Footer */}
                      <div className="column-footer">
                        <button className="add-task-btn">
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Prospect
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          </main>
        </div>
      </div>
    </div>
  );
}