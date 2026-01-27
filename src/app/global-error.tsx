'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0f0f12', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ 
          backgroundColor: '#1a1a1f', 
          borderRadius: '8px', 
          padding: '32px', 
          maxWidth: '400px', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💥</div>
          <h2 style={{ color: 'white', marginBottom: '8px' }}>Critical Error</h2>
          <p style={{ color: '#9ca3af', marginBottom: '16px', fontSize: '14px' }}>
            {error.message || 'A critical error occurred'}
          </p>
          {error.digest && (
            <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '16px' }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
