'use client';

import { useState, useCallback } from 'react';
import { DragDropContext, DropResult, Droppable, Draggable } from '@hello-pangea/dnd';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

type Prospect = {
  _id: Id<"prospects">;
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

const pipelineStages = [
  { id: 'lead', label: 'Lead', color: 'bg-blue-600' },
  { id: 'site_built', label: 'Site Built', color: 'bg-purple-600' },
  { id: 'outreach', label: 'Outreach', color: 'bg-orange-600' },
  { id: 'contacted', label: 'Contacted', color: 'bg-yellow-600' },
  { id: 'follow_up', label: 'Follow Up', color: 'bg-indigo-600' },
  { id: 'negotiating', label: 'Negotiating', color: 'bg-pink-600' },
  { id: 'closed_won', label: 'Closed Won', color: 'bg-green-600' },
  { id: 'closed_lost', label: 'Closed Lost', color: 'bg-red-600' }
] as const;

export default function SalesPipeline() {
  const prospects = useQuery(api.prospects.list);
  const stats = useQuery(api.prospects.stats);
  const createProspect = useMutation(api.prospects.create);
  const updateProspect = useMutation(api.prospects.update);
  const moveProspect = useMutation(api.prospects.move);
  const deleteProspect = useMutation(api.prospects.remove);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [targetStage, setTargetStage] = useState<string>('lead');

  const getProspectsByStage = useCallback((stageId: string) => {
    return prospects?.filter(p => p.stage === stageId) || [];
  }, [prospects]);

  const getUrgencyColor = (urgency: Prospect['urgency']) => {
    switch(urgency) {
      case 'fresh': return 'bg-green-100 text-green-800';
      case 'warm': return 'bg-yellow-100 text-yellow-800';
      case 'cold': return 'bg-red-100 text-red-800';
      case 'no_contact': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysAgo = (dateStr: string) => {
    const diffTime = Date.now() - new Date(dateStr).getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // If dropped in the same position, do nothing
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    await moveProspect({
      id: draggableId as Id<"prospects">,
      newStage: destination.droppableId as Prospect['stage'],
      newOrder: destination.index,
    });
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

  const handleDeleteProspect = async (prospectId: string) => {
    if (!confirm('Delete this prospect?')) return;
    await deleteProspect({ id: prospectId as Id<"prospects"> });
  };

  if (!prospects) {
    return (
      <div className="flex-1 bg-[#0f0f12] flex items-center justify-center">
        <div className="text-gray-400">Loading prospects...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-[#0f0f12]">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#18181b] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-100">Sales Pipeline</h2>
            <p className="text-sm text-gray-400">
              Track prospects through your sales process
            </p>
            {stats && (
              <p className="text-xs text-gray-500 mt-1">
                {stats.total} total • {stats.closed_won} won • {stats.closed_lost} lost
              </p>
            )}
          </div>
          <button 
            onClick={() => handleAddProspect('lead')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            <span>+</span>
            New Prospect
          </button>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="flex-1 overflow-x-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 p-6 min-w-max">
            {pipelineStages.map(stage => {
              const stageProspects = getProspectsByStage(stage.id);
              return (
                <div key={stage.id} className="w-80 bg-[#18181b] rounded-lg border border-gray-800">
                  {/* Stage Header */}
                  <div className="p-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-100">{stage.label}</h3>
                        <p className="text-sm text-gray-400">{stageProspects.length} prospects</p>
                      </div>
                      <button
                        onClick={() => handleAddProspect(stage.id)}
                        className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-sm flex items-center justify-center"
                        title="Add prospect"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Prospects */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-4 space-y-3 max-h-96 overflow-y-auto ${
                          snapshot.isDraggingOver ? 'bg-gray-800/50' : ''
                        }`}
                      >
                        {stageProspects.map((prospect, index) => (
                          <Draggable
                            key={prospect._id}
                            draggableId={prospect._id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-4 bg-[#1f1f23] rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors ${
                                  snapshot.isDragging ? 'shadow-lg bg-gray-700' : ''
                                }`}
                                onClick={() => handleEditProspect(prospect)}
                              >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-medium text-gray-100 text-sm">{prospect.title}</h4>
                                  <div className="flex items-center gap-1">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(prospect.urgency)}`}>
                                      {prospect.urgency}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteProspect(prospect._id);
                                      }}
                                      className="ml-1 w-5 h-5 rounded text-gray-500 hover:text-red-400 hover:bg-red-900/20 text-xs flex items-center justify-center"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>

                                {/* Company & Contact */}
                                <div className="mb-3">
                                  <p className="text-sm font-medium text-gray-200">{prospect.company}</p>
                                  {prospect.contactName && (
                                    <p className="text-xs text-gray-400">{prospect.contactName}</p>
                                  )}
                                  {prospect.location && (
                                    <p className="text-xs text-gray-400">{prospect.location}</p>
                                  )}
                                </div>

                                {/* Contact Methods */}
                                <div className="flex items-center gap-2 mb-3">
                                  {prospect.phone && (
                                    <a 
                                      href={`tel:${prospect.phone}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 text-green-400 hover:text-green-300 text-sm"
                                      title="Call"
                                    >
                                      📞
                                    </a>
                                  )}
                                  {prospect.email && (
                                    <a 
                                      href={`mailto:${prospect.email}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 text-blue-400 hover:text-blue-300 text-sm"
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
                                      className="p-1 text-gray-400 hover:text-gray-300 text-sm"
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
                                      className="p-1 text-gray-400 hover:text-gray-300 text-sm"
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
                                      className="p-1 text-blue-500 hover:text-blue-400 text-sm"
                                      title="Facebook"
                                    >
                                      📘
                                    </a>
                                  )}
                                </div>

                                {/* Industry Tag */}
                                {prospect.industry && (
                                  <div className="mb-2">
                                    <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                                      {prospect.industry}
                                    </span>
                                  </div>
                                )}

                                {/* Last Contacted */}
                                {prospect.lastContacted && (
                                  <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <span>📅</span>
                                    <span>{getDaysAgo(prospect.lastContacted)} days ago</span>
                                  </div>
                                )}

                                {/* Notes Preview */}
                                {prospect.notes && (
                                  <p className="text-xs text-gray-300 mt-2 line-clamp-2">
                                    {prospect.notes}
                                  </p>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Simple Modal for Add/Edit Prospect */}
      {isModalOpen && <ProspectModal 
        prospect={editingProspect}
        targetStage={targetStage}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProspect(null);
        }}
        onSave={async (data) => {
          if (editingProspect) {
            await updateProspect({
              id: editingProspect._id,
              ...data,
            });
          } else {
            await createProspect({
              stage: targetStage as Prospect['stage'],
              ...data,
            });
          }
          setIsModalOpen(false);
          setEditingProspect(null);
        }}
      />}
    </div>
  );
}

// Simple modal component for adding/editing prospects
function ProspectModal({ prospect, targetStage, onClose, onSave }: {
  prospect: Prospect | null;
  targetStage: string;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    title: prospect?.title || '',
    company: prospect?.company || '',
    contactName: prospect?.contactName || '',
    phone: prospect?.phone || '',
    email: prospect?.email || '',
    website: prospect?.website || '',
    facebookUrl: prospect?.facebookUrl || '',
    githubRepo: prospect?.githubRepo || '',
    industry: prospect?.industry || '',
    location: prospect?.location || '',
    notes: prospect?.notes || '',
    urgency: prospect?.urgency || 'fresh' as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#18181b] rounded-lg border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-100 mb-4">
            {prospect ? 'Edit Prospect' : 'New Prospect'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 bg-[#1f1f23] border border-gray-700 rounded-lg text-gray-100"
                  placeholder="e.g., Henderson Plumbing Website"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Company *
                </label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="w-full px-3 py-2 bg-[#1f1f23] border border-gray-700 rounded-lg text-gray-100"
                  placeholder="e.g., Henderson Plumbing Services"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                  className="w-full px-3 py-2 bg-[#1f1f23] border border-gray-700 rounded-lg text-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 bg-[#1f1f23] border border-gray-700 rounded-lg text-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 bg-[#1f1f23] border border-gray-700 rounded-lg text-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full px-3 py-2 bg-[#1f1f23] border border-gray-700 rounded-lg text-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({...formData, industry: e.target.value})}
                  className="w-full px-3 py-2 bg-[#1f1f23] border border-gray-700 rounded-lg text-gray-100"
                  placeholder="e.g., plumbing, landscaping"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-3 py-2 bg-[#1f1f23] border border-gray-700 rounded-lg text-gray-100"
                  placeholder="e.g., Greenville, SC"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 bg-[#1f1f23] border border-gray-700 rounded-lg text-gray-100"
                placeholder="Additional notes..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Urgency
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({...formData, urgency: e.target.value as any})}
                className="w-full px-3 py-2 bg-[#1f1f23] border border-gray-700 rounded-lg text-gray-100"
              >
                <option value="fresh">Fresh</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
                <option value="no_contact">No Contact</option>
              </select>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                {prospect ? 'Update' : 'Create'} Prospect
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}