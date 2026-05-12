import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import V1App from './apps/v1/V1App';
import { V1LoadingFallback } from './components/V1LoadingFallback';

const V2App = () => <div style={{ color: 'white' }}>V2 App Placeholder</div>;

const AppGateway = () => {
  return <Navigate to="/v1" replace />;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/v1/*" element={<V1App />} />
        <Route path="/v2/*" element={<V2App />} />
        <Route path="/" element={<AppGateway />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
