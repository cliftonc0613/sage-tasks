'use client';

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://blessed-hornet-213.convex.cloud";

// Create a singleton client instance
let convexClient: ConvexReactClient | null = null;

function getConvexClient(): ConvexReactClient {
  if (!convexClient) {
    convexClient = new ConvexReactClient(CONVEX_URL);
  }
  return convexClient;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => getConvexClient(), []);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
