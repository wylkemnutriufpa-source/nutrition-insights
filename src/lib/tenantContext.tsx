/**
 * Tenant Context — Phase 3 Multi-Tenant Migration
 * 
 * Resolves the active tenant for the authenticated user.
 * Does NOT alter any existing queries — only provides context
 * for future migration phases.
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ensureContext } from "@/components/common/SystemShield";
import type { Database } from "@/integrations/supabase/types";

type TenantRole = Database["public"]["Enums"]["tenant_role"];
type TenantPlan = Database["public"]["Enums"]["tenant_plan"];

interface TenantInfo {
  id: string;
  name: string;
  slug: string | null;
  planType: TenantPlan;
  isActive: boolean;
}

interface UserTenantMembership {
  tenant: TenantInfo;
  role: TenantRole;
  isActive: boolean;
}

interface TenantContextType {
  /** Current active tenant ID (null while loading or if unresolved) */
  tenantId: string | null;
  /** Current active tenant name */
  tenantName: string | null;
  /** Current active tenant full info */
  tenant: TenantInfo | null;
  /** User's role within the active tenant */
  userTenantRole: TenantRole | null;
  /** All tenants the user belongs to (for future tenant switcher) */
  memberships: UserTenantMembership[];
  /** Whether tenant resolution is in progress */
  isLoading: boolean;
  /** Error message if tenant resolution failed */
  error: string | null;
  /** Whether the user has multiple tenants (for future switcher UI) */
  hasMultipleTenants: boolean;
  /** Switch to a different tenant (for future use) */
  switchTenant: (tenantId: string) => void;
  /** Re-fetch tenant info */
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const TENANT_STORAGE_KEY = "fitjourney_active_tenant";

function getStoredTenantId(): string | null {
  try {
    return localStorage.getItem(TENANT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeActiveTenantId(tenantId: string) {
  try {
    localStorage.setItem(TENANT_STORAGE_KEY, tenantId);
  } catch {}
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [userTenantRole, setUserTenantRole] = useState<TenantRole | null>(null);
  const [memberships, setMemberships] = useState<UserTenantMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveTenant = useCallback(async () => {
    if (!user) {
      setTenantId(null);
      setTenant(null);
      setUserTenantRole(null);
      setMemberships([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all active memberships with tenant info
      const { data: userTenants, error: fetchError } = await supabase
        .from("user_tenants")
        .select(`
          id,
          role,
          is_active,
          tenant_id,
          tenants!user_tenants_tenant_id_fkey (
            id,
            name,
            slug,
            plan_type,
            is_active
          )
        `)
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (fetchError) {
        console.error("Tenant resolution error:", fetchError);
        setError("Erro ao resolver tenant do usuário");
        setIsLoading(false);
        return;
      }

      if (!userTenants || userTenants.length === 0) {
        // No tenant — check if we should auto-create for professional
        const userRole = (user.user_metadata as any)?.role || "patient";
        const isProfessional = userRole === "nutritionist" || userRole === "personal";

        if (isProfessional) {
          console.log("[Tenant] Profissional sem tenant detectado. O sistema deve ter disparado o gatilho. Aguardando...");
          // Em vez de falhar, podemos esperar um pouco ou tentar resolver novamente em 2 segundos
          setTimeout(() => resolveTenant(), 2000);
          return;
        }

        console.warn("User has no active tenant memberships:", user.id);
        setTenantId(null);
        setTenant(null);
        setUserTenantRole(null);
        setMemberships([]);
        setIsLoading(false);
        return;
      }

      // Map memberships
      const mapped: UserTenantMembership[] = userTenants
        .filter((ut) => ut.tenants && (ut.tenants as any).is_active)
        .map((ut) => {
          const t = ut.tenants as any;
          return {
            tenant: {
              id: t.id,
              name: t.name,
              slug: t.slug,
              planType: t.plan_type,
              isActive: t.is_active,
            },
            role: ut.role,
            isActive: ut.is_active,
          };
        });

      setMemberships(mapped);

      if (mapped.length === 0) {
        setTenantId(null);
        setTenant(null);
        setUserTenantRole(null);
        setIsLoading(false);
        return;
      }

      // Select active tenant
      let selected: UserTenantMembership | undefined;

      if (mapped.length === 1) {
        // Single tenant → auto-select
        selected = mapped[0];
      } else {
        // Multiple tenants → check stored preference
        const storedId = getStoredTenantId();
        if (storedId) {
          selected = mapped.find((m) => m.tenant.id === storedId);
        }
        // Fallback to first if stored not found
        if (!selected) {
          selected = mapped[0];
        }
      }

      setTenantId(selected.tenant.id);
      setTenant(selected.tenant);
      setUserTenantRole(selected.role);
      storeActiveTenantId(selected.tenant.id);
    } catch (e) {
      console.error("Unexpected tenant resolution error:", e);
      setError("Erro inesperado ao resolver tenant");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Resolve tenant when auth is ready and user changes
  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    resolveTenant();
  }, [user, authLoading, resolveTenant]);

  const switchTenant = useCallback(
    (newTenantId: string) => {
      const membership = memberships.find((m) => m.tenant.id === newTenantId);
      if (!membership) {
        console.error("Cannot switch to tenant not in memberships:", newTenantId);
        return;
      }
      setTenantId(membership.tenant.id);
      setTenant(membership.tenant);
      setUserTenantRole(membership.role);
      storeActiveTenantId(membership.tenant.id);
    },
    [memberships]
  );

  return (
    <TenantContext.Provider
      value={{
        tenantId,
        tenantName: tenant?.name ?? null,
        tenant,
        userTenantRole,
        memberships,
        isLoading,
        error,
        hasMultipleTenants: memberships.length > 1,
        switchTenant,
        refreshTenant: resolveTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook to access tenant context.
 * Safe to use even when tenant is not yet resolved — check isLoading/tenantId.
 */
export function useTenant() {
  const context = useContext(TenantContext);
  // Independent access: if context is missing, return a default guest state
  if (!context) {
    return {
      tenantId: null,
      tenantName: null,
      tenant: null,
      userTenantRole: null,
      memberships: [],
      isLoading: false,
      error: null,
      hasMultipleTenants: false,
      switchTenant: () => {},
      refreshTenant: async () => {},
    };
  }
  return context;
}

/**
 * Helper: returns tenantId or null.
 * Use in query builders to optionally filter by tenant.
 * During Phase 3 this is passive — queries don't use it yet.
 */
export function useCurrentTenantId(): string | null {
  const { tenantId } = useTenant();
  return tenantId;
}
