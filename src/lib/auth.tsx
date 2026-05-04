import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { invalidateMenuCache } from "@/hooks/useSmartMenu";
import type { Database } from "@/integrations/supabase/types";
import { logAudit } from "@/lib/auditLog";
import { logError } from "@/lib/monitoring";
import { safeLocalStorage } from "@/lib/safeStorage";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  whatsapp?: string | null;
  marmita_mode?: boolean;
  experience_mode?: string;
  experience_mode_locked?: boolean;
  unlock_date?: string | null;
  is_orphan?: boolean;
}

interface SubscriptionState {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  is_trial: boolean;
  trial_end: string | null;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  authStatus: AuthStatus;
  isNutritionist: boolean;
  isPersonal: boolean;
  isPatient: boolean;
  isAdmin: boolean;
  isLojista: boolean;
  subscription: SubscriptionState;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  checkSubscription: () => Promise<void>;
  error: Error | null;
  // Experience Mode
  experienceMode: string;
  experienceRole: "professional" | "patient";
  // Tenant
  tenantId: string | null;
  tenant: any | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultSubscription: SubscriptionState = {
  subscribed: false,
  subscription_tier: null,
  subscription_end: null,
  is_trial: false,
  trial_end: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenant, setTenant] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionState>(defaultSubscription);
  
  const subCheckRef = useRef(false);

  const fetchData = async (userId: string) => {
    // 1 single database call to get Profile + Roles + Tenants
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        *, 
        user_roles(role), 
        user_tenants(
          role, 
          is_active, 
          tenant_id, 
          tenants(id, name, slug, plan_type, is_active)
        )
      `)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      setProfile(data);
      const userRoles = (data as any).user_roles?.map((r: any) => r.role) || [];
      setRoles(userRoles);
      
      // Resolve Tenant
      const memberships = (data as any).user_tenants || [];
      const activeMembership = memberships.find((m: any) => m.is_active && m.tenants?.is_active) || memberships[0];
      
      if (activeMembership?.tenants) {
        setTenantId(activeMembership.tenants.id);
        setTenant(activeMembership.tenants);
      }
    } else {
      setProfile(null);
      setRoles([]);
      setTenantId(null);
      setTenant(null);
    }
  };

  const checkSubscription = async () => {
    if (subCheckRef.current) return;
    subCheckRef.current = true;
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (!error && data) {
        setSubscription({
          subscribed: data.subscribed ?? false,
          subscription_tier: data.subscription_tier ?? null,
          subscription_end: data.subscription_end ?? null,
          is_trial: data.is_trial ?? false,
          trial_end: data.trial_end ?? null,
        });
      }
    } catch (e: any) {
      console.error("Error checking subscription:", e);
    } finally {
      subCheckRef.current = false;
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchData(user.id);
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      console.log("[Auth] Bootstrapping...");
      setLoading(true);
      setError(null);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!mounted) return;

        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchData(currentUser.id);
          checkSubscription();
        }
      } catch (err: any) {
        logError("auth_error", "initialization", err.message);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === "INITIAL_SESSION") return;
        
        console.log(`[Auth] Event: ${event}`);
        
        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);

        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && currentUser) {
          setLoading(true);
          await fetchData(currentUser.id);
          setLoading(false);
        } else if (event === "SIGNED_OUT") {
          setProfile(null);
          setRoles([]);
          setTenantId(null);
          setTenant(null);
          setSubscription(defaultSubscription);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    invalidateMenuCache();
    await supabase.auth.signOut();
  };

  const authStatus: AuthStatus = loading ? "loading" : error ? "error" : user ? "authenticated" : "unauthenticated";

  const isNutritionist = roles.includes("nutritionist");
  const isPersonal = roles.includes("personal");
  const isAdmin = (roles as string[]).includes("admin");
  const isPatient = roles.includes("patient");
  const isLojista = (roles as string[]).includes("lojista");

  const experienceRole: "professional" | "patient" = (isNutritionist || isPersonal || isAdmin) ? "professional" : "patient";
  const experienceMode = profile?.experience_mode || "pro";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        authStatus,
        isNutritionist,
        isPersonal,
        isPatient,
        isAdmin,
        isLojista,
        subscription,
        signOut,
        refreshProfile,
        checkSubscription,
        error,
        experienceMode,
        experienceRole,
        tenantId,
        tenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      session: null,
      profile: null,
      roles: [],
      loading: false,
      authStatus: "loading" as AuthStatus,
      isNutritionist: false,
      isPersonal: false,
      isPatient: false,
      isAdmin: false,
      isLojista: false,
      subscription: defaultSubscription,
      signOut: async () => {},
      refreshProfile: async () => {},
      checkSubscription: async () => {},
      error: null,
      experienceMode: "pro",
      experienceRole: "professional" as const,
      tenantId: null,
      tenant: null,
    };
  }
  return context;
}