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
  patient_state?: string | null;
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
  roles: AppRole[] | null;
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
  setMode: (mode: string) => Promise<void>;
  error: Error | null;
  experienceMode: "basic" | "pro" | "advanced";
  experienceRole: "nutritionist" | "patient";
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
  const [roles, setRoles] = useState<AppRole[] | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenant, setTenant] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionState>(defaultSubscription);
  
  const subCheckRef = useRef(false);

  const fetchData = async (userId: string) => {
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      setProfile((profileRes.data as any) ?? null);
      setRoles(((rolesRes.data ?? []).map((r: any) => r.role)) as AppRole[]);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("[Auth] fetchData error (non-fatal):", e);
      }
      // Non-blocking fallback: empty profile and roles
      setProfile(null);
      setRoles([]);
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
      if (import.meta.env.DEV) {
        console.error("Error checking subscription:", e);
      }
    } finally {
      subCheckRef.current = false;
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchData(user.id);
  };

  const setMode = async (m: string) => {
    if (!user) return;
    
    // Otimismo: atualiza localmente primeiro
    setProfile(prev => prev ? { ...prev, experience_mode: m } : null);

    const { error } = await supabase
      .from("profiles")
      .update({ experience_mode: m } as any)
      .eq("user_id", user.id);
    
    if (error) {
      if (import.meta.env.DEV) {
        console.error("Error updating mode:", error);
      }
      // Revert if error
      await fetchData(user.id);
      throw error;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      setLoading(true);
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession?.user) {
            await fetchData(initialSession.user.id);
          }
        }
      } catch (e) {
        if (import.meta.env.DEV) console.error("Recovery init error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === "INITIAL_SESSION") return;
        
        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);

        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && currentUser) {
          fetchData(currentUser.id).catch((e) => {
            if (import.meta.env.DEV) console.error("[Auth] state fetch:", e);
          });
        } else if (event === "SIGNED_OUT") {
          setProfile(null);
          setRoles(null);
          setSubscription(defaultSubscription);
          setError(null);
        }
      }
    );

    // Realtime Profile Sync
    let profileChannel: any = null;
    if (user?.id) {
      profileChannel = supabase
        .channel(`auth-profile-${user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (mounted) {
              console.log("[Auth] Profile update detected via Realtime", payload.new);
              setProfile(payload.new as Profile);
            }
          }
        )
        .subscribe();
    }

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);

  const signOut = async () => {
    invalidateMenuCache();
    // Clear workspace and context related data
    localStorage.removeItem("fj_workspace_context");
    localStorage.removeItem("fj_last_path");
    
    // Hard clear of any session state to prevent loops
    sessionStorage.clear();
    
    await supabase.auth.signOut();
  };

  const authStatus: AuthStatus = loading ? "loading" : error ? "error" : user ? "authenticated" : "unauthenticated";

  const isNutritionist = roles?.includes("nutritionist") ?? false;
  const isPersonal = roles?.includes("personal") ?? false;
  const isAdmin = (roles as string[] | null)?.includes("admin") ?? false;
  const isPatient = roles?.includes("patient") ?? false;
  const isLojista = (roles as string[] | null)?.includes("lojista") ?? false;

  const experienceRole: "nutritionist" | "patient" = (isNutritionist || isPersonal || isAdmin) ? "nutritionist" : "patient";
  const experienceMode: "basic" | "pro" | "advanced" = (profile?.experience_mode === "pro" || profile?.experience_mode === "advanced") 
    ? profile.experience_mode 
    : "basic";

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
        setMode,
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
      roles: null,
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
      setMode: async (m: string) => {},
      error: null,
      experienceMode: "basic" as const,
      experienceRole: "nutritionist" as const,
      tenantId: null,
      tenant: null,
    };
  }
  return context;
}