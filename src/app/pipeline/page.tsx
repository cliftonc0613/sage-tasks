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
  timeEstimate?: number;
  timeEntries?: { id: string; startTime: string; endTime?: string; notes?: string; duration: number }[];
  totalTimeSpent?: number;
  activeTimerStart?: string;
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

// Empty sample data - pipeline starts clean
const sampleProjects: WebProject[] = [];

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
  
  // Project template queries
  const projectTemplates = useQuery(api.projectTemplates.list);
  const createProjectFromTemplate = useMutation(api.projectTemplates.createProjectFromTemplate);
  const seedWebDevTemplates = useMutation(api.projectTemplates.seedWebDevTemplates);
  
  // Start with empty projects list
  const [localProjects, setLocalProjects] = useState<WebProject[]>([]);
  const projectsData = projects !== undefined ? projects : localProjects;

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
        try {
          await updateProject({
            id: editingProject._id,
            ...projectData,
          });
        } catch (error) {
          console.error('Error updating project:', error);
          alert('Error updating project: ' + (error instanceof Error ? error.message : String(error)));
          return;
        }
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
        try {
          await createProject({
            ...projectData,
            stage: targetColumn as WebProject['stage'],
            subtasks: projectData.subtasks || [],
            comments: projectData.comments || [],
            timeEntries: projectData.timeEntries || [],
            totalTimeSpent: projectData.totalTimeSpent || 0,
          });
        } catch (error) {
          console.error('Error creating project:', error);
          alert('Error creating project: ' + (error instanceof Error ? error.message : String(error)));
          return;
        }
      } else {
        // Use local state
        const newProject: WebProject = {
          _id: Date.now().toString() as Id<"projects">,
          ...projectData,
          stage: targetColumn as WebProject['stage'],
          order: projectsData.filter(p => p.stage === targetColumn).length,
          createdAt: new Date().toISOString(),
          subtasks: projectData.subtasks || [],
          comments: projectData.comments || [],
          timeEntries: projectData.timeEntries || [],
          totalTimeSpent: projectData.totalTimeSpent || 0,
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
    // Return empty array if still loading or no projects
    if (projects === undefined) {
      return [];
    }

    // Use real data once loaded (projects will be [] if empty, or have real projects)
    return projects
      .filter((project) => project.stage === columnId)
      .filter((project) => {
        if (filter === 'all') return true;
        return project.assignee === filter;
      })
      .filter((project) => {
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

  // Use consistent data source for stats (same logic as getProjectsForColumn)
  const statsData = projects !== undefined ? projects : [];
  const totalProjects = statsData?.length || 0;
  const cliftonProjectCount = statsData?.filter(p => p.assignee === 'clifton').length || 0;
  const sageProjectCount = statsData?.filter(p => p.assignee === 'sage').length || 0;
  const completedCount = statsData?.filter(p => p.stage === 'closed').length || 0;
  const liveCount = statsData?.filter(p => p.stage === 'live').length || 0;

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

              {/* Template Quick Create Dropdown */}
              {projectTemplates && projectTemplates.length > 0 && (
                <select
                  onChange={async (e) => {
                    if (e.target.value) {
                      try {
                        // Create project directly from template
                        await createProjectFromTemplate({
                          templateId: e.target.value as Id<"templates">,
                          client: "New Client", // Will need to edit after creation
                          stage: "lead"
                        });
                        // Reset dropdown
                        e.target.value = '';
                      } catch (error) {
                        console.error('Error creating from template:', error);
                        alert('Error creating project from template. Please try again.');
                        e.target.value = '';
                      }
                    }
                  }}
                  className="template-quick-dropdown"
                  title="Quick create from template"
                >
                  <option value="">🎨 Templates...</option>
                  <optgroup label="🏢 Business">
                    {projectTemplates.filter(t => t.projectMetadata?.projectCategory === 'business').map(template => (
                      <option key={template._id} value={template._id}>
                        {template.name} ({template.projectMetadata?.estimatedHours || 'N/A'}h)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🛒 E-commerce">
                    {projectTemplates.filter(t => t.projectMetadata?.projectCategory === 'ecommerce').map(template => (
                      <option key={template._id} value={template._id}>
                        {template.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="📄 Marketing">
                    {projectTemplates.filter(t => t.projectMetadata?.projectCategory === 'marketing').map(template => (
                      <option key={template._id} value={template._id}>
                        {template.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="📋 Planning">
                    {projectTemplates.filter(t => t.projectMetadata?.projectCategory === 'Planning').map(template => (
                      <option key={template._id} value={template._id}>
                        {template.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="📝 Other">
                    {projectTemplates.filter(t => !t.projectMetadata?.projectCategory || 
                      !['business', 'ecommerce', 'marketing', 'Planning'].includes(t.projectMetadata?.projectCategory)).map(template => (
                      <option key={template._id} value={template._id}>
                        {template.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              )}

              {/* Seed Templates Button - only show if no templates exist */}
              {(!projectTemplates || projectTemplates.length === 0) && (
                <button
                  onClick={async () => {
                    try {
                      const result = await seedWebDevTemplates();
                      console.log('Templates seeded:', result);
                    } catch (error) {
                      console.error('Error seeding templates:', error);
                    }
                  }}
                  className="btn btn-secondary"
                  title="Initialize web development project templates"
                >
                  🎨 Setup Templates
                </button>
              )}

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
                      allTasks={statsData?.map(p => ({ _id: p._id, status: p.stage })) || []}
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
          templates={projectTemplates || []}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProject(null);
          }}
          onSave={handleSaveProject}
          onCreateFromTemplate={createProjectFromTemplate}
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

// Helper function to create comments
function createComment(content: string, author: "clifton" | "sage"): { id: string; author: "clifton" | "sage" | "system"; content: string; createdAt: string; mentions?: string[] } {
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

// Helper function to render comment content with mentions
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

// Web Project Modal Component
function WebProjectModal({ isOpen, project, targetStage, templates, onClose, onSave, onCreateFromTemplate }: {
  isOpen: boolean;
  project: WebProject | null;
  targetStage: string;
  templates: any[];
  onClose: () => void;
  onSave: (data: any) => void;
  onCreateFromTemplate?: (args: any) => Promise<any>;
}) {
  const [activeTab, setActiveTab] = useState('details');
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [comments, setComments] = useState<{ id: string; author: "clifton" | "sage" | "system"; content: string; createdAt: string; mentions?: string[] }[]>([]);
  
  // Template selection state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplateFields, setShowTemplateFields] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  // Time tracking state
  const [timeEntries, setTimeEntries] = useState<{ id: string; startTime: string; endTime?: string; notes?: string; duration: number }[]>([]);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [activeTimerStart, setActiveTimerStart] = useState<string | undefined>();
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [manualTimeMinutes, setManualTimeMinutes] = useState('');
  const [manualTimeNotes, setManualTimeNotes] = useState('');
  const [timerNotes, setTimerNotes] = useState('');
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
    timeEstimate: project?.timeEstimate || undefined as number | undefined,
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
        timeEstimate: project?.timeEstimate || undefined,
      });
      setSubtasks(project?.subtasks || []);
      setComments(project?.comments || []);
      // Time tracking
      setTimeEntries(project?.timeEntries || []);
      setTotalTimeSpent(project?.totalTimeSpent || 0);
      setActiveTimerStart(project?.activeTimerStart);
      setActiveTab('details');
      setManualTimeMinutes('');
      setManualTimeNotes('');
      setTimerNotes('');
      
      // Reset template selection
      setSelectedTemplate('');
      setShowTemplateFields(false);
    }
  }, [isOpen, project]);

  // Timer effect - update elapsed time every second when timer is running
  useEffect(() => {
    if (!activeTimerStart) {
      setElapsedTime(0);
      return;
    }

    const updateElapsed = () => {
      const start = new Date(activeTimerStart).getTime();
      const now = Date.now();
      setElapsedTime(Math.floor((now - start) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTimerStart]);

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

  // Comment functions
  const addComment = () => {
    if (newComment.trim()) {
      const commentContent = newComment.trim();
      // For now, always use 'clifton' as the author - could be made dynamic later
      setComments([...comments, createComment(commentContent, 'clifton')]);
      setNewComment('');
    }
  };

  // Time tracking helper functions
  const formatTimeEstimate = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatElapsedTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeEntry = (entry: { startTime: string }): string => {
    const date = new Date(entry.startTime);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Time tracking handlers
  const handleStartTimer = () => {
    setActiveTimerStart(new Date().toISOString());
  };

  const handleStopTimer = () => {
    if (!activeTimerStart) return;
    
    const startTime = new Date(activeTimerStart);
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60); // minutes
    
    const newEntry = {
      id: crypto.randomUUID(),
      startTime: activeTimerStart,
      endTime: endTime.toISOString(),
      duration,
      notes: timerNotes || undefined,
    };
    
    setTimeEntries(prev => [...prev, newEntry]);
    setTotalTimeSpent(prev => prev + duration);
    setActiveTimerStart(undefined);
    setTimerNotes('');
  };

  const handleAddManualTime = () => {
    const minutes = parseInt(manualTimeMinutes);
    if (isNaN(minutes) || minutes <= 0) return;
    
    const now = new Date().toISOString();
    const newEntry = {
      id: crypto.randomUUID(),
      startTime: now,
      endTime: now,
      duration: minutes,
      notes: manualTimeNotes || undefined,
    };
    
    setTimeEntries(prev => [...prev, newEntry]);
    setTotalTimeSpent(prev => prev + minutes);
    setManualTimeMinutes('');
    setManualTimeNotes('');
  };

  const handleDeleteTimeEntry = (entryId: string) => {
    const entryToDelete = timeEntries.find(e => e.id === entryId);
    if (entryToDelete) {
      setTimeEntries(prev => prev.filter(e => e.id !== entryId));
      setTotalTimeSpent(prev => Math.max(0, prev - entryToDelete.duration));
    }
  };

  // Template handling functions
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (!templateId) {
      setShowTemplateFields(false);
      return;
    }
    
    const template = templates.find(t => t._id === templateId);
    if (template) {
      const metadata = template.projectMetadata || {};
      
      // Populate form with template data
      setFormData(prev => ({
        ...prev,
        websiteType: metadata.websiteType || template.name,
        technology: metadata.defaultTechnology || '',
        budget: metadata.defaultBudget || '',
        notes: template.description,
        priority: template.defaultPriority || 'medium',
        timeEstimate: metadata.estimatedHours || undefined,
      }));

      // Populate subtasks from template
      if (template.subtasksEnhanced && template.subtasksEnhanced.length > 0) {
        const templateSubtasks = template.subtasksEnhanced.map((sub: any) => ({
          id: crypto.randomUUID(),
          title: sub.title,
          completed: false,
        }));
        setSubtasks(templateSubtasks);
      } else if (template.subtasks && template.subtasks.length > 0) {
        const templateSubtasks = template.subtasks.map((title: string) => ({
          id: crypto.randomUUID(),
          title,
          completed: false,
        }));
        setSubtasks(templateSubtasks);
      }

      setShowTemplateFields(true);
    }
  };

  const handleUseTemplate = async () => {
    if (!selectedTemplate || !onCreateFromTemplate) return;
    
    try {
      await onCreateFromTemplate({
        templateId: selectedTemplate,
        client: formData.client,
        contactName: formData.contactName,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        stage: targetStage,
        assignee: formData.assignee,
        customBudget: formData.budget,
        customTechnology: formData.technology,
        launchDate: formData.launchDate,
        notes: formData.notes,
      });
      
      // Close modal and reset
      onClose();
    } catch (error) {
      console.error('Error creating project from template:', error);
      alert('Error creating project from template. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client.trim() || !formData.websiteType.trim()) return;
    
    try {
      await onSave({ 
        ...formData, 
        subtasks, 
        comments,
        timeEntries,
        totalTimeSpent,
        activeTimerStart,
        timeEstimate: formData.timeEstimate
      });
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project. Please check the console for details.');
    }
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
            onClick={() => setActiveTab('comments')}
            className={`modal-tab ${activeTab === 'comments' ? 'active' : ''}`}
          >
            💬 Comments ({comments.length})
          </button>
          {project && (
            <button
              onClick={() => setActiveTab('time')}
              className={`modal-tab ${activeTab === 'time' ? 'active' : ''} ${activeTimerStart ? 'timer-running' : ''}`}
            >
              ⏱️ Time {activeTimerStart && <span className="timer-pulse">●</span>}
            </button>
          )}
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
                {/* Template Selection - only for new projects */}
                {!project && (
                  <div className="template-selection-section">
                    <div className="form-group">
                      <label className="form-label">
                        🎨 Project Template (Optional)
                        <span style={{ fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: '8px' }}>
                          Choose a template to pre-fill project details and tasks
                        </span>
                      </label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => handleTemplateSelect(e.target.value)}
                        className="input"
                      >
                        <option value="">Select a template...</option>
                        <optgroup label="🏢 Business Websites">
                          {templates.filter(t => t.projectMetadata?.projectCategory === 'business').map(template => (
                            <option key={template._id} value={template._id}>
                              {template.name} ({template.projectMetadata?.estimatedHours || 'N/A'}h)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="🛒 E-commerce">
                          {templates.filter(t => t.projectMetadata?.projectCategory === 'ecommerce').map(template => (
                            <option key={template._id} value={template._id}>
                              {template.name} ({template.projectMetadata?.estimatedHours || 'N/A'}h)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="📄 Marketing & Landing">
                          {templates.filter(t => t.projectMetadata?.projectCategory === 'marketing').map(template => (
                            <option key={template._id} value={template._id}>
                              {template.name} ({template.projectMetadata?.estimatedHours || 'N/A'}h)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="📝 CMS & WordPress">
                          {templates.filter(t => t.projectMetadata?.projectCategory === 'cms').map(template => (
                            <option key={template._id} value={template._id}>
                              {template.name} ({template.projectMetadata?.estimatedHours || 'N/A'}h)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="⚡ Web Applications">
                          {templates.filter(t => ['webapp', 'custom'].includes(t.projectMetadata?.projectCategory)).map(template => (
                            <option key={template._id} value={template._id}>
                              {template.name} ({template.projectMetadata?.estimatedHours || 'N/A'}h)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="🎨 Portfolio & Creative">
                          {templates.filter(t => t.projectMetadata?.projectCategory === 'portfolio').map(template => (
                            <option key={template._id} value={template._id}>
                              {template.name} ({template.projectMetadata?.estimatedHours || 'N/A'}h)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="📋 Other">
                          {templates.filter(t => !t.projectMetadata?.projectCategory || 
                            !['business', 'ecommerce', 'marketing', 'cms', 'webapp', 'custom', 'portfolio'].includes(t.projectMetadata?.projectCategory)).map(template => (
                            <option key={template._id} value={template._id}>
                              {template.name} ({template.projectMetadata?.estimatedHours || 'N/A'}h)
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    
                    {selectedTemplate && (
                      <div className="template-preview">
                        {(() => {
                          const template = templates.find(t => t._id === selectedTemplate);
                          if (!template) return null;
                          const metadata = template.projectMetadata || {};
                          
                          return (
                            <div className="template-preview-content">
                              <div className="template-info">
                                <h4 className="template-name">{template.name}</h4>
                                <p className="template-description">{template.description}</p>
                                <div className="template-metadata">
                                  {metadata.defaultBudget && (
                                    <span className="template-tag">💰 {metadata.defaultBudget}</span>
                                  )}
                                  {metadata.estimatedHours && (
                                    <span className="template-tag">⏱️ {metadata.estimatedHours}h</span>
                                  )}
                                  {template.totalEstimatedDays && (
                                    <span className="template-tag">📅 {template.totalEstimatedDays} days</span>
                                  )}
                                  {metadata.defaultTechnology && (
                                    <span className="template-tag">🔧 {metadata.defaultTechnology}</span>
                                  )}
                                </div>
                                <div className="template-subtasks-preview">
                                  <strong>Includes {template.subtasksEnhanced?.length || template.subtasks?.length || 0} tasks:</strong>
                                  <ul>
                                    {(template.subtasksEnhanced || template.subtasks)?.slice(0, 4).map((subtask: any, index: number) => (
                                      <li key={index}>
                                        {typeof subtask === 'string' ? subtask : subtask.title}
                                        {subtask.phase && <span className="task-phase"> • {subtask.phase}</span>}
                                      </li>
                                    ))}
                                    {(template.subtasksEnhanced?.length || template.subtasks?.length || 0) > 4 && (
                                      <li>...and {(template.subtasksEnhanced?.length || template.subtasks?.length || 0) - 4} more</li>
                                    )}
                                  </ul>
                                </div>
                              </div>
                              <div className="template-actions">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTemplate('')}
                                  className="btn btn-ghost btn-sm"
                                >
                                  Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowTemplateFields(true)}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Customize & Create
                                </button>
                                <button
                                  type="button"
                                  onClick={handleUseTemplate}
                                  className="btn btn-primary btn-sm"
                                  disabled={!formData.client.trim()}
                                >
                                  Create with Template
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    
                    {(selectedTemplate && showTemplateFields) && (
                      <div className="template-notice">
                        <span className="template-notice-text">
                          ✨ Template applied! Review and customize the details below.
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
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

                <div className="form-row">
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
                  
                  <div className="form-group">
                    <label className="form-label">Time Estimate</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={formData.timeEstimate || ''}
                        onChange={(e) => setFormData({...formData, timeEstimate: e.target.value ? parseInt(e.target.value) : undefined})}
                        className="input"
                        placeholder="hours"
                        min="1"
                        style={{ flex: 1 }}
                      />
                      <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>hours</span>
                      {formData.timeEstimate && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon"
                          onClick={() => setFormData({...formData, timeEstimate: undefined})}
                          title="Clear"
                          style={{ width: '24px', height: '24px' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
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
                    <p>Start a discussion about this project</p>
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

            {/* Time Tracking Tab */}
            {activeTab === 'time' && project && (
              <>
                {/* Timer Section */}
                <div className="time-tracking-section">
                  <h4 className="section-title">Timer</h4>
                  <div className="timer-display">
                    {activeTimerStart ? (
                      <>
                        <div className="timer-clock running">
                          <span className="timer-value">{formatElapsedTime(elapsedTime)}</span>
                          <span className="timer-label">elapsed</span>
                        </div>
                        <input
                          type="text"
                          value={timerNotes}
                          onChange={(e) => setTimerNotes(e.target.value)}
                          className="input timer-notes-input"
                          placeholder="What are you working on?"
                        />
                        <button 
                          onClick={handleStopTimer}
                          className="btn btn-danger timer-btn"
                        >
                          ⏹️ Stop Timer
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={handleStartTimer}
                        className="btn btn-primary timer-btn"
                      >
                        ▶️ Start Timer
                      </button>
                    )}
                  </div>
                </div>

                {/* Time Summary */}
                <div className="time-tracking-section">
                  <h4 className="section-title">Summary</h4>
                  <div className="time-summary">
                    <div className="time-summary-row">
                      <span>Time Spent:</span>
                      <span className="time-value">{formatTimeEstimate(totalTimeSpent)}</span>
                    </div>
                    {formData.timeEstimate && (
                      <>
                        <div className="time-summary-row">
                          <span>Estimated:</span>
                          <span className="time-value">{formatTimeEstimate(formData.timeEstimate * 60)}</span>
                        </div>
                        <div className="time-progress-container">
                          <div className="time-progress-bar">
                            <div 
                              className={`time-progress-fill ${(totalTimeSpent / (formData.timeEstimate * 60)) * 100 > 100 ? 'over' : ''}`}
                              style={{ width: `${Math.min(100, (totalTimeSpent / (formData.timeEstimate * 60)) * 100)}%` }}
                            />
                          </div>
                          <span className={`time-progress-label ${(totalTimeSpent / (formData.timeEstimate * 60)) * 100 > 100 ? 'over' : ''}`}>
                            {Math.round((totalTimeSpent / (formData.timeEstimate * 60)) * 100)}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Add Manual Time */}
                <div className="time-tracking-section">
                  <h4 className="section-title">Add Manual Entry</h4>
                  <div className="manual-time-form">
                    <div className="manual-time-row">
                      <input
                        type="number"
                        value={manualTimeMinutes}
                        onChange={(e) => setManualTimeMinutes(e.target.value)}
                        className="input manual-time-input"
                        placeholder="Minutes"
                        min="1"
                      />
                      <input
                        type="text"
                        value={manualTimeNotes}
                        onChange={(e) => setManualTimeNotes(e.target.value)}
                        className="input"
                        placeholder="Notes (optional)"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={handleAddManualTime}
                        className="btn btn-secondary"
                        disabled={!manualTimeMinutes}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Time Entries List */}
                <div className="time-tracking-section">
                  <h4 className="section-title">Time Entries ({timeEntries.length})</h4>
                  {timeEntries.length === 0 ? (
                    <div className="empty-state">
                      <p>No time entries yet</p>
                      <p>Start the timer or add time manually</p>
                    </div>
                  ) : (
                    <div className="time-entries-list">
                      {[...timeEntries].reverse().map((entry) => (
                        <div key={entry.id} className="time-entry-item">
                          <div className="time-entry-info">
                            <span className="time-entry-duration">
                              {formatTimeEstimate(entry.duration)}
                            </span>
                            <span className="time-entry-date">
                              {formatTimeEntry(entry)}
                            </span>
                            {entry.notes && (
                              <span className="time-entry-notes">{entry.notes}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteTimeEntry(entry.id)}
                            className="btn btn-ghost btn-icon"
                            title="Delete entry"
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
                </div>
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
      
      {/* Template Selection Styles */}
      <style jsx>{`
        .template-selection-section {
          margin-bottom: 24px;
          padding: 16px;
          background: var(--background-subtle);
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        
        .template-preview {
          margin-top: 16px;
          padding: 16px;
          background: var(--background);
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        
        .template-preview-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .template-info {
          flex: 1;
        }
        
        .template-name {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: var(--text-primary);
        }
        
        .template-description {
          font-size: 14px;
          color: var(--text-muted);
          margin: 0 0 12px 0;
          line-height: 1.4;
        }
        
        .template-metadata {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .template-tag {
          background: var(--status-review);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .template-subtasks-preview {
          font-size: 14px;
        }
        
        .template-subtasks-preview ul {
          margin: 8px 0 0 0;
          padding-left: 16px;
        }
        
        .template-subtasks-preview li {
          margin-bottom: 4px;
          font-size: 13px;
        }
        
        .task-phase {
          color: var(--text-muted);
          font-style: italic;
        }
        
        .template-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          align-items: center;
          padding-top: 8px;
          border-top: 1px solid var(--border);
        }
        
        .template-notice {
          margin-top: 16px;
          padding: 12px;
          background: #e3f2fd;
          border: 1px solid #1976d2;
          border-radius: 6px;
          color: #1976d2;
          font-size: 14px;
        }
        
        .template-notice-text {
          font-weight: 500;
        }
        
        @media (max-width: 768px) {
          .template-actions {
            flex-direction: column;
            gap: 8px;
          }
          
          .template-actions button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}