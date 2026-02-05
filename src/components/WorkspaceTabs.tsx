'use client';

import { useState } from 'react';
import { Brain, List, GitBranch, Rocket } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const workspaces = [
  { id: 'tasks', label: 'Tasks', icon: List, emoji: '📋', href: '/' },
  { id: 'pipeline', label: 'Pipeline', icon: GitBranch, emoji: '🔥', href: '/pipeline' },
  { id: 'brain', label: 'Brain', icon: Brain, emoji: '🧠', href: '/brain' },
  { id: 'groundcontrol', label: 'GroundControl', icon: Rocket, emoji: '🚀', href: '/settings' }
];

export default function WorkspaceTabs() {
  const pathname = usePathname();
  const router = useRouter();
  
  const getActiveWorkspace = () => {
    if (pathname === '/') return 'tasks';
    if (pathname.startsWith('/pipeline')) return 'pipeline';
    if (pathname.startsWith('/brain')) return 'brain';
    if (pathname.startsWith('/settings')) return 'groundcontrol';
    return 'tasks';
  };

  const activeWorkspace = getActiveWorkspace();

  const handleTabClick = (workspace: typeof workspaces[0]) => {
    router.push(workspace.href);
  };

  return (
    <div className="border-b border-gray-800 bg-[#0f0f12] relative z-50">
      {/* Header with Logo */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🚀</div>
          <h1 className="text-xl font-bold text-gray-100">GroundControl</h1>
        </div>
        <div className="text-sm text-gray-400">
          Project Management & Sales Pipeline
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex">
        {workspaces.map(workspace => (
          <button
            key={workspace.id}
            onClick={() => handleTabClick(workspace)}
            className={`
              flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all relative
              hover:bg-gray-800 hover:text-gray-100 border-b-2 border-transparent
              ${activeWorkspace === workspace.id
                ? "bg-gray-800 text-gray-100 border-blue-500"
                : "text-gray-400"
              }
            `}
          >
            <span className="text-base">{workspace.emoji}</span>
            {workspace.label}
          </button>
        ))}
      </div>
    </div>
  );
}