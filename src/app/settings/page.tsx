'use client';

import { Settings, Users, Database, Bell, Shield } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex-1 overflow-hidden bg-[#0f0f12]">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#18181b] px-6 py-4">
        <div>
          <h2 className="text-xl font-bold text-gray-100">GroundControl</h2>
          <p className="text-sm text-gray-400">System settings and administration</p>
        </div>
      </div>

      {/* Settings Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#18181b] border border-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-6 w-6 text-blue-400" />
                <h3 className="font-semibold text-gray-100">Team Management</h3>
              </div>
              <p className="text-gray-400 text-sm">Manage users, roles, and permissions</p>
            </div>

            <div className="bg-[#18181b] border border-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-6 w-6 text-green-400" />
                <h3 className="font-semibold text-gray-100">Data & Backup</h3>
              </div>
              <p className="text-gray-400 text-sm">Database management and backups</p>
            </div>

            <div className="bg-[#18181b] border border-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="h-6 w-6 text-yellow-400" />
                <h3 className="font-semibold text-gray-100">Notifications</h3>
              </div>
              <p className="text-gray-400 text-sm">Configure alerts and notifications</p>
            </div>
          </div>

          {/* Main Settings Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* System Status */}
            <div className="bg-[#18181b] border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">System Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Database</span>
                  <span className="text-green-400">Online</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">API Services</span>
                  <span className="text-green-400">Running</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Background Jobs</span>
                  <span className="text-green-400">Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Storage</span>
                  <span className="text-yellow-400">78% Used</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#18181b] border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-2 bg-[#1f1f23] hover:bg-[#26262b] rounded-lg text-gray-300 hover:text-gray-100 transition-colors">
                  Export All Data
                </button>
                <button className="w-full text-left px-4 py-2 bg-[#1f1f23] hover:bg-[#26262b] rounded-lg text-gray-300 hover:text-gray-100 transition-colors">
                  Run System Backup
                </button>
                <button className="w-full text-left px-4 py-2 bg-[#1f1f23] hover:bg-[#26262b] rounded-lg text-gray-300 hover:text-gray-100 transition-colors">
                  Clear Cache
                </button>
                <button className="w-full text-left px-4 py-2 bg-[#1f1f23] hover:bg-[#26262b] rounded-lg text-gray-300 hover:text-gray-100 transition-colors">
                  View System Logs
                </button>
              </div>
            </div>
          </div>

          {/* Application Info */}
          <div className="bg-[#18181b] border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Application Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="block text-gray-400">Version</span>
                <span className="text-gray-200">2.1.0</span>
              </div>
              <div>
                <span className="block text-gray-400">Last Updated</span>
                <span className="text-gray-200">Feb 5, 2026</span>
              </div>
              <div>
                <span className="block text-gray-400">Uptime</span>
                <span className="text-gray-200">7 days</span>
              </div>
              <div>
                <span className="block text-gray-400">Active Users</span>
                <span className="text-gray-200">2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}