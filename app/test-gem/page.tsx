export default function TestGem() {
  return (
    <div style={{ padding: '2rem', background: '#000', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '1rem' }}>Gemini Link Test</h1>
      <a
        href="https://gemini.google.com/app"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          padding: '1rem 2rem',
          background: '#D50000',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '1.25rem',
          textDecoration: 'none',
          border: '2px solid #fff',
        }}
      >
        Open Gemini (test)
      </a>
      <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#999' }}>
        If this link opens Gemini, the issue is in History page structure.
        <br />
        If this link does NOT open Gemini, the issue is browser/device settings.
      </p>
    </div>
  );
}
