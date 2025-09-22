import React from 'react';

export const Header: React.FC = () => {
  return (
    <header style={{
      background: '#fff',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h1 style={{ margin: '0 0 10px 0', color: '#333' }}>
        🦉 GlassOwl Demo
      </h1>
      <p style={{ margin: 0, color: '#666' }}>
        This page is being recorded by GlassOwl. Try interacting with elements, scrolling,
        and navigating to see the telemetry in action.
      </p>
    </header>
  );
};