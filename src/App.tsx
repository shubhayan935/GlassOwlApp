import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { GlassOwl } from './glassowl';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Sessions } from './pages/Sessions';

const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav style={{
      background: '#fff',
      padding: '15px 20px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <Link
        to="/"
        style={{
          marginRight: '20px',
          textDecoration: 'none',
          color: location.pathname === '/' ? '#007bff' : '#666',
          fontWeight: location.pathname === '/' ? 'bold' : 'normal'
        }}
      >
        Home
      </Link>
      <Link
        to="/about"
        style={{
          marginRight: '20px',
          textDecoration: 'none',
          color: location.pathname === '/about' ? '#007bff' : '#666',
          fontWeight: location.pathname === '/about' ? 'bold' : 'normal'
        }}
      >
        About
      </Link>
      <Link
        to="/sessions"
        style={{
          textDecoration: 'none',
          color: location.pathname === '/sessions' ? '#007bff' : '#666',
          fontWeight: location.pathname === '/sessions' ? 'bold' : 'normal'
        }}
      >
        Sessions
      </Link>
      <span style={{ float: 'right', color: '#999' }}>
        🔴 Recording Active
      </span>
    </nav>
  );
};

const AppContent: React.FC = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/sessions" element={<Sessions />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  console.log('App component rendering...');

  return (
    <Router>
      <GlassOwl
        apiKey="demo_project_key_123"
        userId="demo_user_456"
        endpoint="http://localhost:3001/ingest"
      />
      <AppContent />
    </Router>
  );
};

export default App;