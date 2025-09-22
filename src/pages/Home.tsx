import React from 'react';
import { Header } from '../components/Header';
import { InteractiveDemo } from '../components/InteractiveDemo';

export const Home: React.FC = () => {
  return (
    <div>
      <Header />
      <InteractiveDemo />

      <div style={{
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0 }}>Long Content for Scrolling</h2>
        <p>This section has lots of content to demonstrate scroll tracking.</p>
        {Array.from({ length: 20 }, (_, i) => (
          <p key={i}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
            tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
            veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
            commodo consequat. (Paragraph {i + 1})
          </p>
        ))}
      </div>
    </div>
  );
};