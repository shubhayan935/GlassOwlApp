import React, { useState } from 'react';

export const InteractiveDemo: React.FC = () => {
  const [count, setCount] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [selectedOption, setSelectedOption] = useState('option1');

  return (
    <div style={{
      background: '#fff',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginTop: 0 }}>Interactive Elements</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3>Counter</h3>
        <button
          onClick={() => setCount(count + 1)}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Count: {count}
        </button>
        <button
          onClick={() => setCount(0)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Text Input</h3>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type something here..."
          style={{
            padding: '10px',
            width: '300px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <p>You typed: {inputValue}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Select Dropdown</h3>
        <select
          value={selectedOption}
          onChange={(e) => setSelectedOption(e.target.value)}
          style={{
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        >
          <option value="option1">Option 1</option>
          <option value="option2">Option 2</option>
          <option value="option3">Option 3</option>
        </select>
        <p>Selected: {selectedOption}</p>
      </div>

      <div>
        <h3>Dynamic Content</h3>
        <button
          onClick={() => {
            const newDiv = document.createElement('div');
            newDiv.innerHTML = `<p>Dynamically added content at ${new Date().toLocaleTimeString()}</p>`;
            newDiv.style.cssText = 'background: #e9ecef; padding: 10px; margin: 5px 0; border-radius: 4px;';
            document.getElementById('dynamic-content')?.appendChild(newDiv);
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Add Dynamic Content
        </button>
        <div id="dynamic-content" style={{ marginTop: '10px' }}></div>
      </div>
    </div>
  );
};