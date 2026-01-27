'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center p-4">
      <div className="bg-[#1a1a1f] rounded-lg p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-white mb-2">Something went wrong!</h2>
        <p className="text-gray-400 mb-4 text-sm">
          {error.message || 'An unexpected error occurred'}
        </p>
        {error.digest && (
          <p className="text-gray-500 text-xs mb-4">Error ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
