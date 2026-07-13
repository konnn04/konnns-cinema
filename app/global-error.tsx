'use client';

// Only catches errors thrown by the root layout itself, which is why it must
// render its own <html>/<body> -- the layout that would normally do that is
// the thing that failed.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="vi">
      <body style={{ background: '#050505', color: '#f4f4f5', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Đã Có Lỗi Nghiêm Trọng</h1>
            <p style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: '1.5rem' }}>
              Ứng dụng gặp sự cố không thể tự phục hồi. Vui lòng tải lại trang.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#E2B646',
                color: '#000',
                border: 'none',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Tải Lại
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
