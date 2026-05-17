import React from "react";
import { useParams, Navigate, useLocation } from "react-router-dom";
import SafePage from "@/components/common/SafePage";

export function RedirectWithParams({ to }: { to: string }) {
  const params = useParams();
  const location = useLocation();
  let target = to;
  Object.entries(params).forEach(([key, value]) => {
    target = target.replace(`:${key}`, value || "");
  });
  return <Navigate to={`${target}${location.search}`} replace />;
}

export function LP({ children, section }: { children: React.ReactNode; section?: string }) {
  return (
    <SafePage pageName={section || "Página"}>
      {children}
    </SafePage>
  );
}
