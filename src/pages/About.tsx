import React from 'react';
import { Link } from 'react-router-dom';

export const About: React.FC = () => {
  return (
    <div>
      <div style={{
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1>About GlassOwl</h1>
        <p>
          GlassOwl is a UX telemetry and replay tool that captures user interactions
          and allows you to replay them exactly as they happened.
        </p>

        <h2>Features</h2>
        <ul>
          <li>🎥 Session Recording & Replay</li>
          <li>🎯 Mouse Movement & Click Tracking</li>
          <li>📜 Scroll Position Tracking</li>
          <li>🔄 DOM Mutation Detection</li>
          <li>🗺️ Route Change Monitoring</li>
          <li>🔍 Automatic Design Version Fingerprinting</li>
        </ul>

        <h2>Technical Details</h2>
        <p>
          This demo app is instrumented with the GlassOwl SDK. Every interaction
          you make is being captured and sent to our ingest service.
        </p>

        <div style={{ marginTop: '20px' }}>
          <Link
            to="/"
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};