'use client';

import { useState, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useRouter } from 'next/navigation';
import { PipelineColumn } from './PipelineColumn';
import { ProspectModal } from './ProspectModal';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { MobileHeader } from './MobileHeader';

// Export prospects to CSV
function exportToCSV(prospects: Prospect[]) {
  const headers = ['Title', 'Company', 'Contact Name', 'Phone', 'Email', 'Website', 'Industry', 'Location', 'Stage', 'Urgency', 'Notes', 'Created At'];
  const rows = prospects.map(p => [
    p.title,
    p.company,
    p.contactName || '',
    p.phone || '',
    p.email || '',
    p.website || '',
    p.industry || '',
    p.location || '',
    p.stage,
    p.urgency,
    p.notes?.replace(/"/g, '""') || '',
    p.createdAt,
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `sales-pipeline-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

type Prospect = {
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
};

const columns = [
  { id: 'lead', title: 'Lead', color: 'bg-blue-600' },
  { id: 'site_built', title: 'Site Built', color: 'bg-purple-600' },
  { id: 'outreach', title: 'Outreach', color: 'bg-orange-600' },
  { id: 'contacted', title: 'Contacted', color: 'bg-yellow-600' },
  { id: 'follow_up', title: 'Follow Up', color: 'bg-indigo-600' },
  { id: 'negotiating', title: 'Negotiating', color: 'bg-pink-600' },
  { id: 'closed_won', title: 'Closed Won', color: 'bg-green-600' },
  { id: 'closed_lost', title: 'Closed Lost', color: 'bg-red-600' }
] as const;

// Sample data - temporary until Convex API is configured
const sampleProspects: Prospect[] = [
  {
    _id: '1',
    title: 'Henderson Plumbing Website',
    company: 'Henderson Plumbing Services',
    contactName: 'Mike Henderson',
    phone: '+1-555-0123',
    email: 'mike@hendersonplumbing.com',
    website: 'https://henderson-plumbing.com',
    facebookUrl: 'https://facebook.com/hendersonplumbing',
    githubRepo: 'cliftonc0613/henderson-plumbing',
    industry: 'plumbing',
    location: 'Greenville, SC',
    lastContacted: '2024-02-01',
    notes: 'Completed website, very satisfied customer',
    stage: 'closed_won',
    urgency: 'fresh',
    order: 1,
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    _id: '2', 
    title: 'Kicking Tree Lawn Care',
    company: 'Kicking Tree LLC',
    contactName: 'John Tree',
    phone: '+1-555-0456',
    email: 'john@kickingtreelawncare.com',
    website: 'https://kicking-tree-lawn-care.vercel.app',
    facebookUrl: 'https://facebook.com/kickingtree',
    industry: 'landscaping',
    location: 'Greenville, SC', 
    lastContacted: '2024-02-03',
    notes: 'StoryBrand implementation completed',
    stage: 'closed_won',
    urgency: 'fresh',
    order: 2,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    _id: '3',
    title: 'New Heights Tree Service',
    company: 'New Heights Tree Service',
    contactName: 'Sarah Heights',
    phone: '+1-555-0789',
    email: 'sarah@newheightstree.com',
    industry: 'tree_services',
    location: 'Anderson, SC',
    lastContacted: '2024-01-28',
    notes: 'In development - 75% complete',
    stage: 'negotiating',
    urgency: 'warm',
    order: 1,
    createdAt: '2024-02-03T00:00:00Z',
  },
  {
    _id: '4',
    title: 'Blue Ridge Painting',
    company: 'Blue Ridge Painting Co',
    contactName: 'Tom Blue',
    phone: '+1-555-0321',
    email: 'tom@blueridgepainting.com',
    facebookUrl: 'https://facebook.com/blueridgepainting',
    industry: 'painting',
    location: 'Spartanburg, SC',
    lastContacted: '2024-01-20',
    notes: 'Interested in website package',
    stage: 'follow_up',
    urgency: 'cold',
    order: 1,
    createdAt: '2024-01-25T00:00:00Z',
  },
  {
    _id: '5',
    title: 'Sunshine Roofing',
    company: 'Sunshine Roofing LLC',
    contactName: 'Dave Sunshine',
    phone: '+1-555-0555',
    email: 'dave@sunshineroofing.com',
    website: 'https://sunshineroofing.com',
    industry: 'roofing',
    location: 'Spartanburg, SC',
    lastContacted: '2024-02-04',
    notes: 'Looking for website redesign',
    stage: 'lead',
    urgency: 'warm',
    order: 1,
    createdAt: '2024-02-04T00:00:00Z',
  }
];

export default function SalesPipeline() {
  const [prospects, setProspects] = useState<Prospect[]>(sampleProspects);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [targetColumn, setTargetColumn] = useState<string>('lead');
  const [filter, setFilter] = useState<'all' | 'fresh' | 'warm' | 'cold'>('all');
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const router = useRouter();
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');

  // Bulk selection handlers
  const toggleProspectSelection = useCallback((prospectId: string) => {
    setSelectedProspects(prev => {
      const next = new Set(prev);
      if (next.has(prospectId)) {
        next.delete(prospectId);
      } else {
        next.add(prospectId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedProspects(new Set());
    setSelectMode(false);
  }, []);

  const handleBulkMove = async (newStage: Prospect['stage']) => {
    setProspects(prev => prev.map(prospect => 
      selectedProspects.has(prospect._id) 
        ? { ...prospect, stage: newStage, updatedAt: new Date().toISOString() }
        : prospect
    ));
    clearSelection();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedProspects.size} prospects?`)) return;
    setProspects(prev => prev.filter(prospect => !selectedProspects.has(prospect._id)));
    clearSelection();
  };

  const handleExport = () => {
    exportToCSV(prospects);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    setProspects(prev => prev.map(prospect => 
      prospect._id === draggableId 
        ? { 
            ...prospect, 
            stage: destination.droppableId as Prospect['stage'],
            order: destination.index,
            updatedAt: new Date().toISOString()
          }
        : prospect
    ));
  };

  const handleAddProspect = (columnId: string) => {
    setTargetColumn(columnId);
    setEditingProspect(null);
    setIsModalOpen(true);
  };

  const handleEditProspect = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setIsModalOpen(true);
  };

  const handleDeleteProspect = async (prospectId: string) => {
    if (!confirm('Delete this prospect?')) return;
    setProspects(prev => prev.filter(p => p._id !== prospectId));
  };

  const handleSaveProspect = async (prospectData: {
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
    urgency: 'fresh' | 'warm' | 'cold' | 'no_contact';
  }) => {
    if (editingProspect) {
      // Update existing prospect
      setProspects(prev => prev.map(p => 
        p._id === editingProspect._id 
          ? { ...p, ...prospectData, updatedAt: new Date().toISOString() }
          : p
      ));
    } else {
      // Create new prospect
      const newProspect: Prospect = {
        _id: Date.now().toString(),
        ...prospectData,
        stage: targetColumn as Prospect['stage'],
        order: prospects.filter(p => p.stage === targetColumn).length,
        createdAt: new Date().toISOString(),
      };
      setProspects(prev => [...prev, newProspect]);
    }
  };

  const getProspectsForColumn = (columnId: string) => {
    return prospects
      .filter((prospect) => prospect.stage === columnId)
      .filter((prospect) => {
        if (filter === 'all') return true;
        return prospect.urgency === filter;
      })
      .filter((prospect) => {
        // Mobile search filter
        if (!mobileSearchQuery.trim()) return true;
        const query = mobileSearchQuery.toLowerCase();
        return (
          prospect.title.toLowerCase().includes(query) ||
          prospect.company.toLowerCase().includes(query) ||
          prospect.contactName?.toLowerCase().includes(query) ||
          prospect.industry?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => a.order - b.order);
  };

  const totalProspects = prospects.length;
  const freshCount = prospects.filter(p => p.urgency === 'fresh').length;
  const warmCount = prospects.filter(p => p.urgency === 'warm').length;
  const coldCount = prospects.filter(p => p.urgency === 'cold').length;
  const wonCount = prospects.filter(p => p.stage === 'closed_won').length;
  const lostCount = prospects.filter(p => p.stage === 'closed_lost').length;

  return (
    <div className="app-container">
      <MobileHeader 
        title="Pipeline" 
        onAddTask={() => handleAddProspect('lead')}
        searchQuery={mobileSearchQuery}
        onSearchChange={setMobileSearchQuery}
      />
      <Sidebar activePage="pipeline" />
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-top">
            {/* Logo & Title */}
            <div className="header-title">
              <div className="logo">🎯</div>
              <div>
                <h1>Sales Pipeline</h1>
                <p className="header-subtitle">Prospect Management</p>
              </div>
            </div>

            {/* Actions */}
            <div className="header-actions">
              <button
                onClick={() => setSelectMode(!selectMode)}
                className={`btn btn-ghost btn-icon ${selectMode ? 'active' : ''}`}
                title="Multi-select mode"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </button>

              <button
                onClick={handleExport}
                className="btn btn-ghost btn-icon"
                title="Export to CSV"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>

              {/* Desktop Search */}
              <div className="search-input desktop-search">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search prospects..."
                  value={mobileSearchQuery}
                  onChange={(e) => setMobileSearchQuery(e.target.value)}
                  className="input"
                />
                {mobileSearchQuery && (
                  <button
                    onClick={() => setMobileSearchQuery('')}
                    className="search-clear-btn"
                    aria-label="Clear search"
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="filter-select"
              >
                <option value="all">All Prospects</option>
                <option value="fresh">🔥 Fresh</option>
                <option value="warm">⚡ Warm</option>
                <option value="cold">❄️ Cold</option>
              </select>

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
              <div className="stat-value">{totalProspects}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#ef4444' }}>{freshCount}</div>
              <div className="stat-label">🔥 Fresh</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#f59e0b' }}>{warmCount}</div>
              <div className="stat-label">⚡ Warm</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#06b6d4' }}>{coldCount}</div>
              <div className="stat-label">❄️ Cold</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value" style={{ color: 'var(--status-complete)' }}>{wonCount}</div>
              <div className="stat-label">✅ Won</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#dc2626' }}>{lostCount}</div>
              <div className="stat-label">❌ Lost</div>
            </div>
          </div>

          {/* View Tabs */}
          <div className="nav-tabs">
            <button className="nav-tab active">
              Pipeline
            </button>
            <button
              className="nav-tab"
              onClick={() => router.push('/board')}
            >
              Tasks
            </button>
          </div>
        </header>

        {/* Bulk Actions Bar */}
        {selectedProspects.size > 0 && (
          <div className="bulk-actions-bar">
            <div className="bulk-count">
              <span>{selectedProspects.size} selected</span>
              <button onClick={clearSelection} className="btn btn-ghost btn-sm">
                Clear
              </button>
            </div>
            <div className="bulk-buttons">
              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkMove(e.target.value as Prospect['stage']);
                  e.target.value = '';
                }}
                className="bulk-select"
                defaultValue=""
              >
                <option value="" disabled>Move to...</option>
                <option value="lead">Lead</option>
                <option value="site_built">Site Built</option>
                <option value="outreach">Outreach</option>
                <option value="contacted">Contacted</option>
                <option value="follow_up">Follow Up</option>
                <option value="negotiating">Negotiating</option>
                <option value="closed_won">Closed Won</option>
                <option value="closed_lost">Closed Lost</option>
              </select>
              <button onClick={handleBulkDelete} className="btn btn-danger btn-sm">
                🗑️ Delete
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="board-container">
          {/* Pipeline */}
          <main className="board">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="board-columns">
                {columns.map((column) => {
                  const columnProspects = getProspectsForColumn(column.id);

                  return (
                    <PipelineColumn
                      key={column.id}
                      column={{ id: column.id, title: column.title, color: column.color }}
                      prospects={columnProspects}
                      onAddProspect={handleAddProspect}
                      onEditProspect={handleEditProspect}
                      onDeleteProspect={handleDeleteProspect}
                      selectMode={selectMode}
                      selectedProspects={selectedProspects}
                      onToggleSelect={toggleProspectSelection}
                    />
                  );
                })}
              </div>
            </DragDropContext>
          </main>
        </div>

        {/* Modal */}
        <ProspectModal
          isOpen={isModalOpen}
          prospect={editingProspect}
          targetStage={targetColumn}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProspect(null);
          }}
          onSave={handleSaveProspect}
        />
      </div>
      <BottomNav />
    </div>
  );
}