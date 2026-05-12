import { createRoot } from "react-dom/client";
import React from 'react';

const EmergencyRoot = () => (
  <div style={{ backgroundColor: '#050505', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' }}>
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ color: '#22c55e', fontSize: '24px', marginBottom: '20px' }}>FitJourney SYSTEM EMERGENCY</h1>
      <p style={{ color: '#a1a1aa' }}>Direct main.tsx bypass</p>
    </div>
  </div>
);

const rootElement = document.getElementById("root");
if (rootElement) {
  const reactRoot = createRoot(rootElement);
  reactRoot.render(<EmergencyRoot />);
}
