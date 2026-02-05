'use client';

import { useState, useEffect } from 'react';
import { Plus, Phone, Mail, ExternalLink, Globe, Github, Calendar } from 'lucide-react';

interface Prospect {
  id: string;
  title: string;
  company: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  facebook_url?: string;
  github_repo?: string;
  loom_url?: string;
  industry?: string;
  location?: string;
  last_contacted?: Date;
  notes?: string;
  stage: 'lead' | 'site_built' | 'outreach' | 'contacted' | 'follow_up' | 'negotiating' | 'closed_won' | 'closed_lost';
  urgency: 'fresh' | 'warm' | 'cold' | 'no_contact';
  created_at: Date;
}

const pipelineStages = [
  { id: 'lead', label: 'Lead', color: 'bg-blue-600', count: 0 },
  { id: 'site_built', label: 'Site Built', color: 'bg-purple-600', count: 0 },
  { id: 'outreach', label: 'Outreach', color: 'bg-orange-600', count: 0 },
  { id: 'contacted', label: 'Contacted', color: 'bg-yellow-600', count: 0 },
  { id: 'follow_up', label: 'Follow Up', color: 'bg-indigo-600', count: 0 },
  { id: 'negotiating', label: 'Negotiating', color: 'bg-pink-600', count: 0 },
  { id: 'closed_won', label: 'Closed Won', color: 'bg-green-600', count: 0 },
  { id: 'closed_lost', label: 'Closed Lost', color: 'bg-red-600', count: 0 }
];

// Sample data based on the plan
const sampleProspects: Prospect[] = [
  {
    id: '1',
    title: 'Henderson Plumbing Website',
    company: 'Henderson Plumbing Services',
    contact_name: 'Mike Henderson',
    phone: '+1-555-0123',
    email: 'mike@hendersonplumbing.com',
    website: 'https://henderson-plumbing.com',
    facebook_url: 'https://facebook.com/hendersonplumbing',
    github_repo: 'cliftonc0613/henderson-plumbing',
    industry: 'plumbing',
    location: 'Greenville, SC',
    last_contacted: new Date('2024-02-01'),
    notes: 'Completed website, very satisfied customer',
    stage: 'closed_won',
    urgency: 'fresh',
    created_at: new Date('2024-01-15')
  },
  {
    id: '2', 
    title: 'Kicking Tree Lawn Care',
    company: 'Kicking Tree LLC',
    contact_name: 'John Tree',
    phone: '+1-555-0456',
    email: 'john@kickingtreelawncare.com',
    website: 'https://kicking-tree-lawn-care.vercel.app',
    facebook_url: 'https://facebook.com/kickingtree',
    industry: 'landscaping',
    location: 'Greenville, SC', 
    last_contacted: new Date('2024-02-03'),
    notes: 'StoryBrand implementation completed',
    stage: 'closed_won',
    urgency: 'fresh',
    created_at: new Date('2024-02-01')
  },
  {
    id: '3',
    title: 'New Heights Tree Service',
    company: 'New Heights Tree Service',
    contact_name: 'Sarah Heights',
    phone: '+1-555-0789',
    email: 'sarah@newheightstree.com',
    industry: 'tree_services',
    location: 'Anderson, SC',
    last_contacted: new Date('2024-01-28'),
    notes: 'In development - 75% complete',
    stage: 'negotiating',
    urgency: 'warm',
    created_at: new Date('2024-02-03')
  },
  {
    id: '4',
    title: 'Blue Ridge Painting',
    company: 'Blue Ridge Painting Co',
    contact_name: 'Tom Blue',
    phone: '+1-555-0321',
    email: 'tom@blueridgepainting.com',
    facebook_url: 'https://facebook.com/blueridgepainting',
    industry: 'painting',
    location: 'Spartanburg, SC',
    last_contacted: new Date('2024-01-20'),
    notes: 'Interested in website package',
    stage: 'follow_up',
    urgency: 'cold',
    created_at: new Date('2024-01-25')
  }
];

export default function SalesPipeline() {
  const [prospects, setProspects] = useState<Prospect[]>(sampleProspects);

  const getProspectsByStage = (stageId: string) => {
    return prospects.filter(p => p.stage === stageId);
  };

  const getUrgencyColor = (urgency: Prospect['urgency']) => {
    switch(urgency) {
      case 'fresh': return 'bg-green-100 text-green-800';
      case 'warm': return 'bg-yellow-100 text-yellow-800';
      case 'cold': return 'bg-red-100 text-red-800';
      case 'no_contact': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysAgo = (date: Date) => {
    const diffTime = Date.now() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

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
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
            <Plus className="h-4 w-4" />
            New Prospect
          </button>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 p-6 min-w-max">
          {pipelineStages.map(stage => {
            const stageProspects = getProspectsByStage(stage.id);
            return (
              <div key={stage.id} className="w-80 bg-[#18181b] rounded-lg border border-gray-800">
                {/* Stage Header */}
                <div className="p-4 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <div>
                      <h3 className="font-semibold text-gray-100">{stage.label}</h3>
                      <p className="text-sm text-gray-400">{stageProspects.length} prospects</p>
                    </div>
                  </div>
                </div>

                {/* Prospects */}
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {stageProspects.map(prospect => (
                    <div key={prospect.id} className="p-4 bg-[#1f1f23] rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-100 text-sm">{prospect.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(prospect.urgency)}`}>
                          {prospect.urgency}
                        </span>
                      </div>

                      {/* Company & Contact */}
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-200">{prospect.company}</p>
                        {prospect.contact_name && (
                          <p className="text-xs text-gray-400">{prospect.contact_name}</p>
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
                            className="p-1 text-green-400 hover:text-green-300"
                            title="Call"
                          >
                            <Phone className="h-3 w-3" />
                          </a>
                        )}
                        {prospect.email && (
                          <a 
                            href={`mailto:${prospect.email}`}
                            className="p-1 text-blue-400 hover:text-blue-300"
                            title="Email"
                          >
                            <Mail className="h-3 w-3" />
                          </a>
                        )}
                        {prospect.website && (
                          <a 
                            href={prospect.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-gray-400 hover:text-gray-300"
                            title="Website"
                          >
                            <Globe className="h-3 w-3" />
                          </a>
                        )}
                        {prospect.github_repo && (
                          <a 
                            href={`https://github.com/${prospect.github_repo}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 text-gray-400 hover:text-gray-300"
                            title="GitHub"
                          >
                            <Github className="h-3 w-3" />
                          </a>
                        )}
                        {prospect.facebook_url && (
                          <a 
                            href={prospect.facebook_url}
                            target="_blank"
                            rel="noopener noreferrer" 
                            className="p-1 text-blue-500 hover:text-blue-400"
                            title="Facebook"
                          >
                            <ExternalLink className="h-3 w-3" />
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
                      {prospect.last_contacted && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="h-3 w-3" />
                          <span>{getDaysAgo(prospect.last_contacted)} days ago</span>
                        </div>
                      )}

                      {/* Notes Preview */}
                      {prospect.notes && (
                        <p className="text-xs text-gray-300 mt-2 line-clamp-2">
                          {prospect.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}