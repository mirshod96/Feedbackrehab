import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { FeedbackForm } from './pages/FeedbackForm';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';

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

        <Routes>
          <Route path="/" element={<FeedbackForm />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
