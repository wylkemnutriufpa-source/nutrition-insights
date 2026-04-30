import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "../pages/Auth";
import Index from "../pages/Index";

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};