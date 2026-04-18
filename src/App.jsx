import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Загружаем страницы динамически (Ленивая загрузка), чтобы сжать размер основного кода
const FeedbackForm = React.lazy(() => import('./pages/FeedbackForm').then(m => ({ default: m.FeedbackForm })));
const AnalyticsDashboard = React.lazy(() => import('./pages/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));

const FallbackLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
    <Loader2 className="btn-spinner" size={40} color="var(--color-primary)" />
    <div style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Загрузка компонентов...</div>
  </div>
);

function App() {
  return (
    <Router>
      <div>
        <nav style={{ 
          padding: '1.5rem', 
          textAlign: 'center', 
          backgroundColor: 'var(--color-surface)', 
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'center',
          gap: '3rem',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: 'var(--shadow-sm)'
        }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: '1.25rem' }}>Feedback Form</Link>
          <Link to="/analytics" style={{ textDecoration: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: '1.25rem' }}>Analytics Dashboard</Link>
        </nav>

        <Suspense fallback={<FallbackLoader />}>
          <Routes>
            <Route path="/" element={<FeedbackForm />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
