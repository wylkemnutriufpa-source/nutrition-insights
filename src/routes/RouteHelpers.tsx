import React from "react";
import { useParams, Navigate } from "react-router-dom";

export function RedirectWithParams({ to }: { to: string }) {
  const params = useParams();
  let target = to;
  Object.entries(params).forEach(([key, value]) => {
    target = target.replace(`:${key}`, value || "");
  });
  return <Navigate to={target} replace />;
}

export function LP({ children, section, SafePage }: { children: React.ReactNode; section?: string; SafePage: any }) {
  return (
    <SafePage pageName={section || "Página"}>
      {children}
    </SafePage>
  );
}
