import { useAuth } from "@/lib/auth";

export function TenantProvider({ children }: { children: React.ReactNode }) {
  // TenantProvider removed to simplify boot. 
  // We just render children and useAuth provides the tenant context now.
  return <>{children}</>;
}

export function useTenant() {
  const { tenantId, tenant, loading } = useAuth();
  
  return {
    tenantId,
    tenantName: tenant?.name ?? null,
    tenant,
    userTenantRole: null, // Basic version
    memberships: [],
    isLoading: loading,
    error: null,
    hasMultipleTenants: false,
    switchTenant: () => {},
    refreshTenant: async () => {},
  };
}

export function useCurrentTenantId(): string | null {
  const { tenantId } = useAuth();
  return tenantId;
}