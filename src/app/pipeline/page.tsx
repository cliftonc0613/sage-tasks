'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, DropResult, Droppable, Draggable } from '@hello-pangea/dnd';

// Prospect type
type Prospect = {
  id: string;
  title: string;
  company: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  industry?: string;
  location?: string;
  notes?: string;
  stage: string;
  urgency: 'fresh' | 'warm' | 'cold' | 'no_contact';
};

// Prospect form data
type ProspectFormData = {
  title: string;
  company: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  industry?: string;
  location?: string;
  notes?: string;
  urgency: 'fresh' | 'warm' | 'cold' | 'no_contact';
};

// Sample data
const initialProspects: Prospect[] = [
  { 
    id: '1', 
    title: 'Henderson Plumbing Website', 
    company: 'Henderson Plumbing Services',
    contactName: 'Mike Henderson',
    phone: '+1-555-0123',
    email: 'mike@hendersonplumbing.com',
    website: 'https://henderson-plumbing.com',
    industry: 'plumbing',
    location: 'Greenville, SC',
    notes: 'Completed website, very satisfied customer',
    stage: 'closed_won',
    urgency: 'fresh'
  },
  { 
    id: '2', 
    title: 'Kicking Tree Lawn Care', 
    company: 'Kicking Tree LLC',
    contactName: 'John Tree',
    phone: '+1-555-0456', 
    email: 'john@kickingtreelawncare.com',
    website: 'https://kicking-tree-lawn-care.vercel.app',
    industry: 'landscaping',
    location: 'Greenville, SC',
    notes: 'StoryBrand implementation completed',
    stage: 'closed_won',
    urgency: 'fresh'
  },
  { 
    id: '3', 
    title: 'New Heights Tree Service', 
    company: 'New Heights Tree Service',
    contactName: 'Sarah Heights',
    phone: '+1-555-0789',
    email: 'sarah@newheightstree.com',
    industry: 'tree_services',
    location: 'Anderson, SC',
    notes: 'In development - 75% complete',
    stage: 'negotiating',
    urgency: 'warm'
  },
  { 
    id: '4', 
    title: 'Blue Ridge Painting', 
    company: 'Blue Ridge Painting Co',
    contactName: 'Tom Blue',
    phone: '+1-555-0321',
    email: 'tom@blueridgepainting.com',
    industry: 'painting',
    location: 'Spartanburg, SC', 
    notes: 'Interested in website package',
    stage: 'follow_up',
    urgency: 'cold'
  },
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

// Prospect Modal Component
function ProspectModal({ isOpen, prospect, targetStage, onClose, onSave }: {
  isOpen: boolean;
  prospect: Prospect | null;
  targetStage: string;
  onClose: () => void;
  onSave: (data: ProspectFormData) => void;
}) {
  const [formData, setFormData] = useState<ProspectFormData>({
    title: prospect?.title || '',
    company: prospect?.company || '',
    contactName: prospect?.contactName || '',
    phone: prospect?.phone || '',
    email: prospect?.email || '',
    website: prospect?.website || '',
    industry: prospect?.industry || '',
    location: prospect?.location || '',
    notes: prospect?.notes || '',
    urgency: prospect?.urgency || 'fresh',
  });

  // Update form when prospect changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: prospect?.title || '',
        company: prospect?.company || '',
        contactName: prospect?.contactName || '',
        phone: prospect?.phone || '',
        email: prospect?.email || '',
        website: prospect?.website || '',
        industry: prospect?.industry || '',
        location: prospect?.location || '',
        notes: prospect?.notes || '',
        urgency: prospect?.urgency || 'fresh',
      });
    }
  }, [isOpen, prospect]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.company.trim()) return;
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 className="modal-title">
              {prospect ? 'Edit Prospect' : 'New Prospect'}
            </h2>
            {!prospect && (
              <span className="modal-subtitle">Adding to {targetStage.replace('_', ' ')}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-content">
          <form onSubmit={handleSubmit} className="task-form">
            {/* Basic Information */}
            <div className="form-section">
              <h3 className="form-section-title">Basic Information</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label" htmlFor="title">Title *</label>
                  <input
                    id="title"
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="form-input"
                    placeholder="e.g., Henderson Plumbing Website"
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="company">Company *</label>
                  <input
                    id="company"
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="form-input"
                    placeholder="e.g., Henderson Plumbing Services"
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="contactName">Contact Name</label>
                  <input
                    id="contactName"
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                    className="form-input"
                    placeholder="e.g., Mike Henderson"
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="urgency">Urgency</label>
                  <select
                    id="urgency"
                    value={formData.urgency}
                    onChange={(e) => setFormData({...formData, urgency: e.target.value as any})}
                    className="form-select"
                  >
                    <option value="fresh">Fresh</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                    <option value="no_contact">No Contact</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="form-section">
              <h3 className="form-section-title">Contact Information</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label" htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="form-input"
                    placeholder="+1-555-0123"
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="form-input"
                    placeholder="contact@company.com"
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="website">Website</label>
                  <input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    className="form-input"
                    placeholder="https://company.com"
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="industry">Industry</label>
                  <input
                    id="industry"
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({...formData, industry: e.target.value})}
                    className="form-input"
                    placeholder="e.g., plumbing, landscaping"
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="location">Location</label>
                  <input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="form-input"
                    placeholder="e.g., Greenville, SC"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="form-section">
              <div className="form-field">
                <label className="form-label" htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={4}
                  className="form-textarea"
                  placeholder="Additional notes, next steps, conversation highlights..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="modal-actions">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!formData.title.trim() || !formData.company.trim()}
              >
                {prospect ? 'Update Prospect' : 'Create Prospect'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [targetStage, setTargetStage] = useState<string>('lead');

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

  const handleAddProspect = (stageId: string) => {
    setTargetStage(stageId);
    setEditingProspect(null);
    setIsModalOpen(true);
  };

  const handleEditProspect = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setIsModalOpen(true);
  };

  const handleSaveProspect = (formData: ProspectFormData) => {
    if (editingProspect) {
      // Update existing prospect
      setProspects(prev => prev.map(p => 
        p.id === editingProspect.id 
          ? { ...p, ...formData }
          : p
      ));
    } else {
      // Create new prospect
      const newProspect: Prospect = {
        id: Date.now().toString(),
        ...formData,
        stage: targetStage,
      };
      setProspects(prev => [...prev, newProspect]);
    }
    setIsModalOpen(false);
    setEditingProspect(null);
  };

  const handleDeleteProspect = (prospectId: string) => {
    if (confirm('Delete this prospect?')) {
      setProspects(prev => prev.filter(p => p.id !== prospectId));
    }
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
              <button 
                onClick={() => handleAddProspect('lead')}
                className="btn btn-primary"
              >
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
                        <button 
                          onClick={() => handleAddProspect(stage.id)}
                          className="btn btn-ghost btn-icon" 
                          title="Add prospect"
                        >
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
                                    onClick={() => handleEditProspect(prospect)}
                                  >
                                    {/* Header with delete button */}
                                    <div className="task-card-header">
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={`priority-badge ${prospect.urgency}`}>
                                          <span className="priority-dot" />
                                          {prospect.urgency}
                                        </span>
                                      </div>
                                      <div className="task-card-actions">
                                        <button
                                          onClick={(e) => { 
                                            e.stopPropagation(); 
                                            handleDeleteProspect(prospect.id); 
                                          }}
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
                                    
                                    <h4 className="task-card-title">{prospect.title}</h4>
                                    <p className="task-card-desc">{prospect.company}</p>
                                    {prospect.contactName && (
                                      <p className="task-card-desc" style={{ fontSize: '12px', color: '#888' }}>
                                        {prospect.contactName}
                                      </p>
                                    )}
                                    
                                    {/* Footer with contact info */}
                                    <div className="task-card-footer">
                                      <div className="task-card-meta">
                                        {prospect.phone && (
                                          <span className="task-meta-item">📞</span>
                                        )}
                                        {prospect.email && (
                                          <span className="task-meta-item">📧</span>
                                        )}
                                        {prospect.website && (
                                          <span className="task-meta-item">🌐</span>
                                        )}
                                        {prospect.industry && (
                                          <span className="task-meta-item project-tag">
                                            {prospect.industry}
                                          </span>
                                        )}
                                      </div>
                                    </div>
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
                        <button 
                          onClick={() => handleAddProspect(stage.id)}
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
                })}
              </div>
            </DragDropContext>
          </main>
        </div>

        {/* Prospect Modal */}
        <ProspectModal
          isOpen={isModalOpen}
          prospect={editingProspect}
          targetStage={targetStage}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProspect(null);
          }}
          onSave={handleSaveProspect}
        />
      </div>
    </div>
  );
}
}