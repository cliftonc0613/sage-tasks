'use client';

import { useState, useCallback, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Column } from '../../components/Column';
import { Sidebar } from '../../components/Sidebar';
import { BottomNav } from '../../components/BottomNav';
import { MobileHeader } from '../../components/MobileHeader';

// Export projects to CSV
function exportToCSV(projects: WebProject[]) {
  const headers = ['Client', 'Website Type', 'Stage', 'Budget', 'Technology', 'Launch Date', 'Contact', 'Phone', 'Email', 'Notes', 'Created At'];
  const rows = projects.map(p => [
    p.client,
    p.websiteType,
    p.stage,
    p.budget || '',
    p.technology || '',
    p.launchDate || '',
    p.contactName || '',
    p.phone || '',
    p.email || '',
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
  link.setAttribute('download', `web-design-pipeline-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

type WebProject = {
  _id: Id<"projects">;
  client: string;
  websiteType: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  stage: "lead" | "design" | "development" | "review" | "live" | "closed";
  budget?: string;
  technology?: string;
  launchDate?: string;
  notes?: string;
  priority: "low" | "medium" | "high";
  order: number;
  createdAt: string;
  updatedAt?: string;
  assignee: "clifton" | "sage" | "unassigned";
  subtasks: { id: string; title: string; completed: boolean }[];
  comments: { id: string; author: "clifton" | "sage" | "system"; content: string; createdAt: string }[];
};

// Web design specific columns
const columns = [
  { id: 'lead', title: 'Lead' },
  { id: 'design', title: 'Design' },
  { id: 'development', title: 'Development' },
  { id: 'review', title: 'Review' },
  { id: 'live', title: 'Live' },
  { id: 'closed', title: 'Closed' },
] as const;

// Using Convex for real-time data - sample projects moved to database

// Temporary sample data until Convex projects table is deployed
const sampleProjects: WebProject[] = [
  {
    _id: '1' as Id<"projects">,
    client: 'Henderson Plumbing Services',
    websiteType: 'Business Website',
    contactName: 'Mike Henderson',
    phone: '+1-555-0123',
    email: 'mike@hendersonplumbing.com',
    website: 'https://cliftonc0613.github.io/henderson-plumbing/',
    stage: 'closed',
    budget: '$2,500',
    technology: 'HTML/CSS/JS',
    launchDate: '2024-01-15',
    notes: 'Professional plumbing website',
    priority: 'high',
    order: 1,
    createdAt: '2024-01-01T00:00:00Z',
    assignee: 'clifton',
    subtasks: [],
    comments: []
  },
  {
    _id: '2' as Id<"projects">,
    client: 'Kicking Tree Lawn Care',
    websiteType: 'Service Business Site',
    contactName: 'John Tree',
    phone: '+1-555-0456',
    email: 'john@kickingtreelawncare.com',
    website: 'https://kicking-tree-lawn-care.vercel.app/',
    stage: 'live',
    budget: '$3,000',
    technology: 'HTML/CSS/JS + StoryBrand',
    launchDate: '2024-02-01',
    notes: 'StoryBrand framework implementation',
    priority: 'high',
    order: 1,
    createdAt: '2024-01-15T00:00:00Z',
    assignee: 'clifton',
    subtasks: [],
    comments: []
  },
  {
    _id: '3' as Id<"projects">,
    client: 'New Heights Tree Service',
    websiteType: 'Tree Service Website',
    contactName: 'Sarah Heights',
    phone: '+1-555-0789',
    email: 'sarah@newheightstree.com',
    stage: 'development',
    budget: '$2,800',
    technology: 'HTML/CSS/JS',
    launchDate: '2024-02-15',
    notes: 'Tree removal service website',
    priority: 'medium',
    order: 1,
    createdAt: '2024-01-20T00:00:00Z',
    assignee: 'clifton',
    subtasks: [],
    comments: []
  }
];

export default function PipelinePage() {
  // Enable Convex for real-time auto-sync
  const projects = useQuery(api.projects.list);
  const stats = useQuery(api.projects.stats);
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const moveProject = useMutation(api.projects.move);
  const deleteProject = useMutation(api.projects.remove);
  const bulkUpdateProjects = useMutation(api.projects.bulkUpdate);
  const bulkDeleteProjects = useMutation(api.projects.bulkDelete);
  
  // Fallback to local state if projects table doesn't exist yet
  const [localProjects, setLocalProjects] = useState<WebProject[]>(sampleProjects);
  const projectsData = projects || localProjects;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<WebProject | null>(null);
  const [targetColumn, setTargetColumn] = useState<string>('lead');
  const [filter, setFilter] = useState<'all' | 'clifton' | 'sage'>('all');
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const router = useRouter();
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');

  // Bulk selection handlers
  const toggleProjectSelection = useCallback((projectId: string) => {
    setSelectedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedProjects(new Set());
    setSelectMode(false);
  }, []);

  const handleBulkMove = async (newStage: WebProject['stage']) => {
    if (!projectsData) return;
    
    const movingProjects = projectsData.filter(p => selectedProjects.has(p._id));
    const stageEmoji = {
      'lead': '🎯',
      'design': '🎨', 
      'development': '🛠️',
      'review': '👀',
      'live': '🚀',
      'closed': '✅'
    };
    
    // Use Convex mutation if available, otherwise fallback to local state
    if (bulkUpdateProjects) {
      await bulkUpdateProjects({
        ids: Array.from(selectedProjects) as Id<"projects">[],
        updates: { stage: newStage }
      });
    } else {
      // Use local state
      setLocalProjects(prev => prev.map(project => 
        selectedProjects.has(project._id) 
          ? { ...project, stage: newStage, updatedAt: new Date().toISOString() }
          : project
      ));
    }
    
    // Send bulk move notification
    sendTelegramNotification(
      `📊 BULK STAGE MOVE\n\n` +
      `${stageEmoji[newStage]} Moved ${movingProjects.length} projects to ${newStage.toUpperCase()}\n\n` +
      `Projects:\n` +
      movingProjects.map(p => `• ${p.client}`).join('\n')
    );
    
    clearSelection();
  };

  const handleBulkAssign = async (assignee: WebProject['assignee']) => {
    if (!projectsData) return;
    
    const assigningProjects = projectsData.filter(p => selectedProjects.has(p._id));
    const assigneeLabel = assignee === 'clifton' ? '👤 Clifton' : assignee === 'sage' ? '🌿 Sage' : 'Unassigned';
    
    // Use Convex mutation if available
    if (bulkUpdateProjects) {
      await bulkUpdateProjects({
        ids: Array.from(selectedProjects) as Id<"projects">[],
        updates: { assignee }
      });
    } else {
      // Use local state
      setLocalProjects(prev => prev.map(project => 
        selectedProjects.has(project._id) 
          ? { ...project, assignee, updatedAt: new Date().toISOString() }
          : project
      ));
    }
    
    // Send bulk assign notification
    sendTelegramNotification(
      `👥 BULK ASSIGNMENT\n\n` +
      `Assigned ${assigningProjects.length} projects to ${assigneeLabel}\n\n` +
      `Projects:\n` +
      assigningProjects.map(p => `• ${p.client}`).join('\n')
    );
    
    clearSelection();
  };

  const handleBulkDelete = async () => {
    if (!projectsData) return;
    
    const deletingProjects = projectsData.filter(p => selectedProjects.has(p._id));
    if (!confirm(`Delete ${selectedProjects.size} projects?`)) return;
    
    // Use Convex mutation if available
    if (bulkDeleteProjects) {
      await bulkDeleteProjects({
        ids: Array.from(selectedProjects) as Id<"projects">[]
      });
    } else {
      // Use local state
      setLocalProjects(prev => prev.filter(project => !selectedProjects.has(project._id)));
    }
    
    // Send bulk delete notification
    sendTelegramNotification(
      `🗑️ BULK DELETE\n\n` +
      `Deleted ${deletingProjects.length} projects:\n\n` +
      deletingProjects.map(p => `• ${p.client} (${p.stage})`).join('\n')
    );
    
    clearSelection();
  };

  const handleExport = () => {
    if (!projectsData) return;
    exportToCSV(projectsData);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!projectsData) return;
    
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    // Find the project being moved
    const movingProject = projectsData.find(p => p._id === draggableId);
    if (!movingProject) return;

    // Use Convex mutation if available
    if (moveProject) {
      await moveProject({
        id: draggableId as Id<"projects">,
        newStage: destination.droppableId as WebProject['stage'],
        newOrder: destination.index
      });
    } else {
      // Use local state
      setLocalProjects(prev => prev.map(project => 
        project._id === draggableId 
          ? { 
              ...project, 
              stage: destination.droppableId as WebProject['stage'],
              order: destination.index,
              updatedAt: new Date().toISOString()
            }
          : project
      ));
    }

    // Send stage movement notification
    const fromStage = source.droppableId.replace('_', ' ').toUpperCase();
    const toStage = destination.droppableId.replace('_', ' ').toUpperCase();
    
    const stageEmoji = {
      'LEAD': '🎯',
      'DESIGN': '🎨', 
      'DEVELOPMENT': '🛠️',
      'REVIEW': '👀',
      'LIVE': '🚀',
      'CLOSED': '✅'
    };

    sendTelegramNotification(
      `📊 PROJECT STAGE CHANGE\n\n` +
      `${stageEmoji[fromStage as keyof typeof stageEmoji] || '📋'} ${fromStage} → ${stageEmoji[toStage as keyof typeof stageEmoji] || '📋'} ${toStage}\n\n` +
      `Client: ${movingProject.client}\n` +
      `Type: ${movingProject.websiteType}\n` +
      `Budget: ${movingProject.budget || 'TBD'}`
    );
  };

  const handleAddProject = (columnId: string) => {
    setTargetColumn(columnId);
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleEditProject = (project: WebProject) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!projectsData) return;
    
    const projectToDelete = projectsData.find(p => p._id === projectId);
    if (!projectToDelete) return;
    
    if (!confirm('Delete this project?')) return;
    
    // Use Convex mutation if available
    if (deleteProject) {
      await deleteProject({ id: projectId as Id<"projects"> });
    } else {
      // Use local state
      setLocalProjects(prev => prev.filter(p => p._id !== projectId));
    }
    
    // Send deletion notification
    sendTelegramNotification(
      `🗑️ PROJECT DELETED\n\n` +
      `Client: ${projectToDelete.client}\n` +
      `Type: ${projectToDelete.websiteType}\n` +
      `Stage: ${projectToDelete.stage}\n` +
      `Budget: ${projectToDelete.budget || 'TBD'}`
    );
  };

  // Telegram notification function
  const sendTelegramNotification = async (message: string) => {
    try {
      // Send notification to Telegram
      await fetch('/api/telegram-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
    } catch (error) {
      console.log('Telegram notification failed:', error);
    }
  };

  const handleSaveProject = async (projectData: any) => {
    if (projectData._delete && editingProject) {
      // Delete project - use Convex if available
      if (deleteProject) {
        await deleteProject({ id: editingProject._id });
      } else {
        // Use local state
        setLocalProjects(prev => prev.filter(p => p._id !== editingProject._id));
      }
      
      // Send deletion notification
      sendTelegramNotification(
        `🗑️ PROJECT DELETED\n\n` +
        `Client: ${editingProject.client}\n` +
        `Type: ${editingProject.websiteType}\n` +
        `Stage: ${editingProject.stage}`
      );
      
      setIsModalOpen(false);
      setEditingProject(null);
      return;
    }
    
    if (editingProject) {
      // Update existing project - use Convex if available
      if (updateProject) {
        await updateProject({
          id: editingProject._id,
          ...projectData,
        });
      } else {
        // Use local state
        setLocalProjects(prev => prev.map(p => 
          p._id === editingProject._id 
            ? { ...p, ...projectData, updatedAt: new Date().toISOString() }
            : p
        ));
      }
      
      // Send update notification
      sendTelegramNotification(
        `📝 PROJECT UPDATED\n\n` +
        `Client: ${projectData.client}\n` +
        `Type: ${projectData.websiteType}\n` +
        `Budget: ${projectData.budget || 'TBD'}\n` +
        `Assignee: ${projectData.assignee === 'clifton' ? '👤 Clifton' : projectData.assignee === 'sage' ? '🌿 Sage' : 'Unassigned'}\n` +
        `Priority: ${projectData.priority === 'high' ? '🔴 High' : projectData.priority === 'medium' ? '🟡 Medium' : '🟢 Low'}`
      );
    } else {
      // Create new project - use Convex if available
      if (createProject) {
        await createProject({
          ...projectData,
          stage: targetColumn as WebProject['stage'],
          subtasks: [],
          comments: [],
        });
      } else {
        // Use local state
        const newProject: WebProject = {
          _id: Date.now().toString() as Id<"projects">,
          ...projectData,
          stage: targetColumn as WebProject['stage'],
          order: projectsData.filter(p => p.stage === targetColumn).length,
          createdAt: new Date().toISOString(),
          subtasks: [],
          comments: [],
        };
        setLocalProjects(prev => [...prev, newProject]);
      }
      
      // Send new project notification
      sendTelegramNotification(
        `🎯 NEW WEB PROJECT ADDED\n\n` +
        `Client: ${projectData.client}\n` +
        `Type: ${projectData.websiteType}\n` +
        `Stage: ${targetColumn}\n` +
        `Budget: ${projectData.budget || 'TBD'}\n` +
        `Assignee: ${projectData.assignee === 'clifton' ? '👤 Clifton' : projectData.assignee === 'sage' ? '🌿 Sage' : 'Unassigned'}\n` +
        `Priority: ${projectData.priority === 'high' ? '🔴 High' : projectData.priority === 'medium' ? '🟡 Medium' : '🟢 Low'}\n` +
        `Launch Date: ${projectData.launchDate || 'TBD'}`
      );
    }
    setIsModalOpen(false);
    setEditingProject(null);
  };

  const getProjectsForColumn = (columnId: string) => {
    if (!projectsData) return [];
    
    return projectsData
      .filter((project) => project.stage === columnId)
      .filter((project) => {
        if (filter === 'all') return true;
        return project.assignee === filter;
      })
      .filter((project) => {
        // Mobile search filter
        if (!mobileSearchQuery.trim()) return true;
        const query = mobileSearchQuery.toLowerCase();
        return (
          project.client.toLowerCase().includes(query) ||
          project.websiteType.toLowerCase().includes(query) ||
          project.contactName?.toLowerCase().includes(query) ||
          project.technology?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => a.order - b.order);
  };

  const totalProjects = projectsData?.length || 0;
  const cliftonProjectCount = projectsData?.filter(p => p.assignee === 'clifton').length || 0;
  const sageProjectCount = projectsData?.filter(p => p.assignee === 'sage').length || 0;
  const completedCount = projectsData?.filter(p => p.stage === 'closed').length || 0;
  const liveCount = projectsData?.filter(p => p.stage === 'live').length || 0;

  return (
    <div className="app-container">
      <MobileHeader 
        title="Pipeline" 
        onAddTask={() => handleAddProject('lead')}
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
              <div className="logo">🎨</div>
              <div>
                <h1>Web Design Pipeline</h1>
                <p className="header-subtitle">Client Project Management</p>
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
                  placeholder="Search projects..."
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
                <option value="all">All Projects</option>
                <option value="clifton">👤 Clifton</option>
                <option value="sage">🌿 Sage</option>
              </select>

              <button
                onClick={() => handleAddProject('lead')}
                className="btn btn-primary"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Project
                <span className="shortcut-badge">⌘K</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="stats-bar">
            <div className="stat-item">
              <div className="stat-value">{totalProjects}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#3b82f6' }}>{cliftonProjectCount}</div>
              <div className="stat-label">👤 Clifton</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value" style={{ color: 'var(--status-complete)' }}>{sageProjectCount}</div>
              <div className="stat-label">🌿 Sage</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value" style={{ color: 'var(--status-complete)' }}>{liveCount}</div>
              <div className="stat-label">🚀 Live</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value" style={{ color: 'var(--status-complete)' }}>{completedCount}</div>
              <div className="stat-label">✅ Closed</div>
            </div>
          </div>

          {/* View Tabs */}
          <div className="nav-tabs">
            <button className="nav-tab active">
              Pipeline
            </button>
            <button
              className="nav-tab"
              onClick={() => router.push('/')}
            >
              Tasks
            </button>
            <button
              className="nav-tab"
              onClick={() => router.push('/calendar')}
            >
              Calendar
            </button>
            <button
              className="nav-tab"
              onClick={() => router.push('/dashboard')}
            >
              Dashboard
            </button>
          </div>
        </header>

        {/* Bulk Actions Bar */}
        {selectedProjects.size > 0 && (
          <div className="bulk-actions-bar">
            <div className="bulk-count">
              <span>{selectedProjects.size} selected</span>
              <button onClick={clearSelection} className="btn btn-ghost btn-sm">
                Clear
              </button>
            </div>
            <div className="bulk-buttons">
              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkMove(e.target.value as WebProject['stage']);
                  e.target.value = '';
                }}
                className="bulk-select"
                defaultValue=""
              >
                <option value="" disabled>Move to...</option>
                <option value="lead">Lead</option>
                <option value="design">Design</option>
                <option value="development">Development</option>
                <option value="review">Review</option>
                <option value="live">Live</option>
                <option value="closed">Closed</option>
              </select>
              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkAssign(e.target.value as WebProject['assignee']);
                  e.target.value = '';
                }}
                className="bulk-select"
                defaultValue=""
              >
                <option value="" disabled>Assign to...</option>
                <option value="clifton">👤 Clifton</option>
                <option value="sage">🌿 Sage</option>
                <option value="unassigned">Unassigned</option>
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
                  const columnProjects = getProjectsForColumn(column.id);

                  return (
                    <Column
                      key={column.id}
                      column={{ id: column.id, title: column.title, taskIds: [] }}
                      tasks={columnProjects.map(p => ({
                        ...p,
                        title: p.client,
                        description: p.websiteType,
                        status: p.stage
                      })) as any}
                      allTasks={projectsData?.map(p => ({ _id: p._id, status: p.stage })) || []}
                      onAddTask={handleAddProject}
                      onEditTask={(project: any) => handleEditProject(project as WebProject)}
                      onDeleteTask={handleDeleteProject}
                      selectMode={selectMode}
                      selectedTasks={selectedProjects}
                      onToggleSelect={toggleProjectSelection}
                    />
                  );
                })}
              </div>
            </DragDropContext>
          </main>
        </div>

        {/* Web Project Modal */}
        <WebProjectModal
          isOpen={isModalOpen}
          project={editingProject}
          targetStage={targetColumn}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProject(null);
          }}
          onSave={handleSaveProject}
        />
      </div>
      <BottomNav />
    </div>
  );
}

// Helper function to create subtasks
function createSubtask(title: string): { id: string; title: string; completed: boolean } {
  return {
    id: crypto.randomUUID(),
    title,
    completed: false,
  };
}

// Web Project Modal Component
function WebProjectModal({ isOpen, project, targetStage, onClose, onSave }: {
  isOpen: boolean;
  project: WebProject | null;
  targetStage: string;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [activeTab, setActiveTab] = useState('details');
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [formData, setFormData] = useState({
    client: project?.client || '',
    websiteType: project?.websiteType || '',
    contactName: project?.contactName || '',
    phone: project?.phone || '',
    email: project?.email || '',
    website: project?.website || '',
    budget: project?.budget || '',
    technology: project?.technology || '',
    launchDate: project?.launchDate || '',
    notes: project?.notes || '',
    priority: project?.priority || 'medium' as const,
    assignee: project?.assignee || 'unassigned' as const,
  });

  // Update form when project changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        client: project?.client || '',
        websiteType: project?.websiteType || '',
        contactName: project?.contactName || '',
        phone: project?.phone || '',
        email: project?.email || '',
        website: project?.website || '',
        budget: project?.budget || '',
        technology: project?.technology || '',
        launchDate: project?.launchDate || '',
        notes: project?.notes || '',
        priority: project?.priority || 'medium',
        assignee: project?.assignee || 'unassigned',
      });
      setSubtasks(project?.subtasks || []);
      setActiveTab('details');
    }
  }, [isOpen, project]);

  // Subtask functions
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client.trim() || !formData.websiteType.trim()) return;
    onSave({ ...formData, subtasks });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal task-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 className="modal-title">
              {project ? 'Edit Web Project' : 'New Web Project'}
            </h2>
            {!project && (
              <span style={{ 
                fontSize: '12px', 
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                Adding to {targetStage}
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
            onClick={() => setActiveTab('notes')}
            className={`modal-tab ${activeTab === 'notes' ? 'active' : ''}`}
          >
            📋 Project Notes
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
            {/* Details Tab */}
            {activeTab === 'details' && (
              <>
                <div className="form-group">
                  <label className="form-label">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.client}
                    onChange={(e) => setFormData({...formData, client: e.target.value})}
                    className="input"
                    placeholder="e.g., Henderson Plumbing Services"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Website Description</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={4}
                    className="input"
                    placeholder="Project requirements, special features, client preferences..."
                    style={{ resize: 'vertical', minHeight: '100px' }}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Assign To</label>
                    <select
                      value={formData.assignee}
                      onChange={(e) => setFormData({...formData, assignee: e.target.value as any})}
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
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
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
                    <label className="form-label">Website Type</label>
                    <select
                      required
                      value={formData.websiteType}
                      onChange={(e) => setFormData({...formData, websiteType: e.target.value})}
                      className="input"
                    >
                      <option value="">Select service type...</option>
                      
                      {/* Home Services */}
                      <optgroup label="🏠 Home Services">
                        <option value="Plumbing Services">Plumbing Services</option>
                        <option value="HVAC Services">HVAC Services</option>
                        <option value="Electrical Services">Electrical Services</option>
                        <option value="Roofing Services">Roofing Services</option>
                        <option value="Painting Services">Painting Services</option>
                        <option value="Flooring Services">Flooring Services</option>
                        <option value="Kitchen & Bath Remodeling">Kitchen & Bath Remodeling</option>
                        <option value="General Contractor">General Contractor</option>
                        <option value="Handyman Services">Handyman Services</option>
                        <option value="Windows & Doors">Windows & Doors</option>
                        <option value="Insulation Services">Insulation Services</option>
                        <option value="Foundation Repair">Foundation Repair</option>
                      </optgroup>

                      {/* Outdoor Services */}
                      <optgroup label="🌿 Outdoor Services">
                        <option value="Landscaping Services">Landscaping Services</option>
                        <option value="Lawn Care Services">Lawn Care Services</option>
                        <option value="Tree Services">Tree Services</option>
                        <option value="Irrigation Services">Irrigation Services</option>
                        <option value="Hardscaping">Hardscaping</option>
                        <option value="Pool Services">Pool Services</option>
                        <option value="Fence Installation">Fence Installation</option>
                        <option value="Deck & Patio Services">Deck & Patio Services</option>
                        <option value="Snow Removal">Snow Removal</option>
                        <option value="Outdoor Lighting">Outdoor Lighting</option>
                      </optgroup>

                      {/* Cleaning Services */}
                      <optgroup label="🧹 Cleaning Services">
                        <option value="House Cleaning">House Cleaning</option>
                        <option value="Commercial Cleaning">Commercial Cleaning</option>
                        <option value="Carpet Cleaning">Carpet Cleaning</option>
                        <option value="Window Cleaning">Window Cleaning</option>
                        <option value="Pressure Washing">Pressure Washing</option>
                        <option value="Junk Removal">Junk Removal</option>
                        <option value="Mold Remediation">Mold Remediation</option>
                        <option value="Restoration Services">Restoration Services</option>
                      </optgroup>

                      {/* Auto Services */}
                      <optgroup label="🚗 Auto Services">
                        <option value="Auto Repair">Auto Repair</option>
                        <option value="Auto Detailing">Auto Detailing</option>
                        <option value="Oil Change">Oil Change</option>
                        <option value="Tire Services">Tire Services</option>
                        <option value="Collision Repair">Collision Repair</option>
                        <option value="Mobile Mechanic">Mobile Mechanic</option>
                        <option value="Towing Services">Towing Services</option>
                      </optgroup>

                      {/* Professional Services */}
                      <optgroup label="💼 Professional Services">
                        <option value="Law Firm">Law Firm</option>
                        <option value="Accounting Services">Accounting Services</option>
                        <option value="Real Estate Agent">Real Estate Agent</option>
                        <option value="Insurance Agency">Insurance Agency</option>
                        <option value="Financial Advisor">Financial Advisor</option>
                        <option value="Consulting Services">Consulting Services</option>
                        <option value="Marketing Agency">Marketing Agency</option>
                        <option value="IT Services">IT Services</option>
                      </optgroup>

                      {/* Health & Wellness */}
                      <optgroup label="🏥 Health & Wellness">
                        <option value="Dental Practice">Dental Practice</option>
                        <option value="Medical Practice">Medical Practice</option>
                        <option value="Chiropractic">Chiropractic</option>
                        <option value="Physical Therapy">Physical Therapy</option>
                        <option value="Massage Therapy">Massage Therapy</option>
                        <option value="Veterinary Services">Veterinary Services</option>
                        <option value="Mental Health Services">Mental Health Services</option>
                        <option value="Fitness Training">Fitness Training</option>
                      </optgroup>

                      {/* Personal Services */}
                      <optgroup label="✂️ Personal Services">
                        <option value="Hair Salon">Hair Salon</option>
                        <option value="Barber Shop">Barber Shop</option>
                        <option value="Nail Salon">Nail Salon</option>
                        <option value="Spa Services">Spa Services</option>
                        <option value="Photography">Photography</option>
                        <option value="Event Planning">Event Planning</option>
                        <option value="Catering Services">Catering Services</option>
                        <option value="Pet Services">Pet Services</option>
                      </optgroup>

                      {/* Specialty Services */}
                      <optgroup label="🔧 Specialty Services">
                        <option value="Locksmith">Locksmith</option>
                        <option value="Security Services">Security Services</option>
                        <option value="Appliance Repair">Appliance Repair</option>
                        <option value="Pest Control">Pest Control</option>
                        <option value="Moving Services">Moving Services</option>
                        <option value="Storage Services">Storage Services</option>
                        <option value="Funeral Services">Funeral Services</option>
                        <option value="Wedding Services">Wedding Services</option>
                      </optgroup>

                      {/* Other */}
                      <optgroup label="📄 Other Types">
                        <option value="E-commerce Store">E-commerce Store</option>
                        <option value="Restaurant/Food">Restaurant/Food</option>
                        <option value="Portfolio Site">Portfolio Site</option>
                        <option value="Blog/News Site">Blog/News Site</option>
                        <option value="Landing Page">Landing Page</option>
                        <option value="Non-Profit">Non-Profit</option>
                        <option value="Other Service Business">Other Service Business</option>
                      </optgroup>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Launch Date</label>
                    <input
                      type="date"
                      value={formData.launchDate}
                      onChange={(e) => setFormData({...formData, launchDate: e.target.value})}
                      className="input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Budget Estimate</label>
                  <input
                    type="text"
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: e.target.value})}
                    className="input"
                    placeholder="e.g., $2,500"
                  />
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
                    <p>Break down this project into smaller steps</p>
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

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <>
                <div className="form-group">
                  <label className="form-label">Technology Stack</label>
                  <input
                    type="text"
                    value={formData.technology}
                    onChange={(e) => setFormData({...formData, technology: e.target.value})}
                    className="input"
                    placeholder="e.g., HTML/CSS/JS, React, WordPress"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contact Name</label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                      className="input"
                      placeholder="e.g., Mike Henderson"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="input"
                      placeholder="+1-555-0123"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="input"
                      placeholder="contact@company.com"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Current Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className="input"
                      placeholder="https://currentsite.com"
                    />
                  </div>
                </div>
              </>
            )}

          </div>

          {/* Footer */}
          <div className="modal-footer">
            {/* Delete button (left side, only for existing projects) */}
            {project && (
              <div className="modal-footer-left">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Delete this project?')) {
                      // Handle delete - call parent delete function
                      onSave({ ...project, _delete: true });
                    }
                  }}
                  className="btn btn-danger-outline"
                  title="Delete project"
                >
                  🗑️ Delete
                </button>
              </div>
            )}
            
            <div className="modal-footer-right">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                {project ? 'Close' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!formData.client.trim() || !formData.websiteType.trim()}
              >
                {project ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}