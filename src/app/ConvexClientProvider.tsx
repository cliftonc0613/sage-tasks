'use client';

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useState, useEffect } from "react";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://blessed-hornet-213.convex.cloud";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ConvexReactClient | null>(null);

  useEffect(() => {
    // Only create the client on the client side
    const convexClient = new ConvexReactClient(CONVEX_URL);
    setClient(convexClient);
    
    return () => {
      // Cleanup on unmount if needed
    };
  }, []);

  // Show loading state while client initializes
  if (!client) {
    return (
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo">🌿</div>
            <div className="logo-text">
              <span className="logo-title">Sage Tasks</span>
              <span className="logo-subtitle">Project Management</span>
            </div>
          </div>
        </aside>
        <div className="main-content">
          <div className="loading">
            <div className="loading-spinner"></div>
            <span>Connecting...</span>
          </div>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
