'use client';

import React, { useState, useEffect } from 'react';
import { Id } from '../../convex/_generated/dataModel';

interface Prospect {
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
}

interface ProspectModalProps {
  isOpen: boolean;
  prospect?: Prospect | null;
  targetStage?: string;
  onClose: () => void;
  onSave: (prospectData: ProspectFormData) => Promise<void>;
}

interface ProspectFormData {
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
}

export function ProspectModal({ isOpen, prospect, targetStage, onClose, onSave }: ProspectModalProps) {
  const [formData, setFormData] = useState<ProspectFormData>({
    title: '',
    company: '',
    contactName: '',
    phone: '',
    email: '',
    website: '',
    facebookUrl: '',
    githubRepo: '',
    loomUrl: '',
    industry: '',
    location: '',
    lastContacted: '',
    notes: '',
    urgency: 'fresh',
  });

  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (prospect) {
        setFormData({
          title: prospect.title,
          company: prospect.company,
          contactName: prospect.contactName || '',
          phone: prospect.phone || '',
          email: prospect.email || '',
          website: prospect.website || '',
          facebookUrl: prospect.facebookUrl || '',
          githubRepo: prospect.githubRepo || '',
          loomUrl: prospect.loomUrl || '',
          industry: prospect.industry || '',
          location: prospect.location || '',
          lastContacted: prospect.lastContacted || '',
          notes: prospect.notes || '',
          urgency: prospect.urgency,
        });
      } else {
        // New prospect
        setFormData({
          title: '',
          company: '',
          contactName: '',
          phone: '',
          email: '',
          website: '',
          facebookUrl: '',
          githubRepo: '',
          loomUrl: '',
          industry: '',
          location: '',
          lastContacted: '',
          notes: '',
          urgency: 'fresh',
        });
      }
    }
  }, [isOpen, prospect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.company.trim()) return;

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving prospect:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      company: '',
      contactName: '',
      phone: '',
      email: '',
      website: '',
      facebookUrl: '',
      githubRepo: '',
      loomUrl: '',
      industry: '',
      location: '',
      lastContacted: '',
      notes: '',
      urgency: 'fresh',
    });
    onClose();
  };

  const updateFormData = (updates: Partial<ProspectFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 className="modal-title">
              {prospect ? 'Edit Prospect' : 'New Prospect'}
            </h2>
            {!prospect && targetStage && (
              <span className="modal-subtitle">Adding to {targetStage.replace('_', ' ')}</span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-icon"
            disabled={isSaving}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-content">
          <form onSubmit={handleSubmit} className="prospect-form">
            {/* Basic Information */}
            <div className="form-section">
              <h3 className="form-section-title">Basic Information</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label" htmlFor="title">
                    Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => updateFormData({ title: e.target.value })}
                    className="form-input"
                    placeholder="e.g., Henderson Plumbing Website"
                    disabled={isSaving}
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="company">
                    Company *
                  </label>
                  <input
                    id="company"
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => updateFormData({ company: e.target.value })}
                    className="form-input"
                    placeholder="e.g., Henderson Plumbing Services"
                    disabled={isSaving}
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="contactName">
                    Contact Name
                  </label>
                  <input
                    id="contactName"
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => updateFormData({ contactName: e.target.value })}
                    className="form-input"
                    placeholder="e.g., Mike Henderson"
                    disabled={isSaving}
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="urgency">
                    Urgency
                  </label>
                  <select
                    id="urgency"
                    value={formData.urgency}
                    onChange={(e) => updateFormData({ urgency: e.target.value as any })}
                    className="form-select"
                    disabled={isSaving}
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
                  <label className="form-label" htmlFor="phone">
                    Phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData({ phone: e.target.value })}
                    className="form-input"
                    placeholder="+1-555-0123"
                    disabled={isSaving}
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData({ email: e.target.value })}
                    className="form-input"
                    placeholder="contact@company.com"
                    disabled={isSaving}
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="website">
                    Website
                  </label>
                  <input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateFormData({ website: e.target.value })}
                    className="form-input"
                    placeholder="https://company.com"
                    disabled={isSaving}
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="facebookUrl">
                    Facebook URL
                  </label>
                  <input
                    id="facebookUrl"
                    type="url"
                    value={formData.facebookUrl}
                    onChange={(e) => updateFormData({ facebookUrl: e.target.value })}
                    className="form-input"
                    placeholder="https://facebook.com/company"
                    disabled={isSaving}
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="githubRepo">
                    GitHub Repository
                  </label>
                  <input
                    id="githubRepo"
                    type="text"
                    value={formData.githubRepo}
                    onChange={(e) => updateFormData({ githubRepo: e.target.value })}
                    className="form-input"
                    placeholder="username/repo-name"
                    disabled={isSaving}
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="loomUrl">
                    Loom URL
                  </label>
                  <input
                    id="loomUrl"
                    type="url"
                    value={formData.loomUrl}
                    onChange={(e) => updateFormData({ loomUrl: e.target.value })}
                    className="form-input"
                    placeholder="https://loom.com/share/..."
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div className="form-section">
              <h3 className="form-section-title">Business Details</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label" htmlFor="industry">
                    Industry
                  </label>
                  <input
                    id="industry"
                    type="text"
                    value={formData.industry}
                    onChange={(e) => updateFormData({ industry: e.target.value })}
                    className="form-input"
                    placeholder="e.g., plumbing, landscaping, painting"
                    disabled={isSaving}
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="location">
                    Location
                  </label>
                  <input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => updateFormData({ location: e.target.value })}
                    className="form-input"
                    placeholder="e.g., Greenville, SC"
                    disabled={isSaving}
                  />
                </div>
                
                <div className="form-field">
                  <label className="form-label" htmlFor="lastContacted">
                    Last Contacted
                  </label>
                  <input
                    id="lastContacted"
                    type="date"
                    value={formData.lastContacted}
                    onChange={(e) => updateFormData({ lastContacted: e.target.value })}
                    className="form-input"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="form-section">
              <div className="form-field">
                <label className="form-label" htmlFor="notes">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => updateFormData({ notes: e.target.value })}
                  rows={4}
                  className="form-textarea"
                  placeholder="Additional notes, next steps, conversation highlights..."
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="modal-actions">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-ghost"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!formData.title.trim() || !formData.company.trim() || isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="btn-spinner" />
                    {prospect ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {prospect ? 'Update Prospect' : 'Create Prospect'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}