import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

function BootError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : '';

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Money Planner โหลดไม่สำเร็จ</h1>
      <p style={{ marginBottom: 16 }}>ตอนนี้แอปเจอ error ตอนเปิดหน้าเว็บ รายละเอียดอยู่ด้านล่าง:</p>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#fee2e2', color: '#991b1b', padding: 16, borderRadius: 12 }}>
        {message}
      </pre>
      {stack && (
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f1f5f9', color: '#334155', padding: 16, borderRadius: 12, marginTop: 16, fontSize: 12 }}>
          {stack}
        </pre>
      )}
    </div>
  );
}

async function start() {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    document.body.innerHTML = '<div style="padding:24px;font-family:sans-serif">ไม่เจอ div id="root" ใน index.html</div>';
    return;
  }

  const root = ReactDOM.createRoot(rootElement);

  try {
    const { default: App } = await import('./App');
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error(error);
    root.render(<BootError error={error} />);
  }
}

start();
