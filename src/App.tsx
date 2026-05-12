import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';

const V1App = lazy(() => import('./apps/v1/V1App'));
const V2App = lazy(() => import('./apps/v2/V2App'));

const AppGateway = () => {
  // Simple gateway: for now, everyone goes to V1 by default.
  // In a real scenario, this would check roles/beta status.
  return <Navigate to="/v1" replace />;
};

const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="h-screen w-screen bg-black" />}>
        <Routes>
          <Route path="/v1/*" element={<V1App />} />
          <Route path="/v2/*" element={<V2App />} />
          <Route path="/" element={<AppGateway />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
