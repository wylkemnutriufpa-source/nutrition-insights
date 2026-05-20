import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { invalidateMenuCache } from "@/hooks/useSmartMenu";
import type { Database } from "@/integrations/supabase/types";
import { logAudit } from "@/lib/auditLog";
import { logError } from "@/lib/monitoring";
import { safeLocalStorage } from "@/lib/safeStorage";

type AppRole = Database["public"]["Enums"]["app_role"] | "admin_master";

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
  onboarding_completed?: boolean;
  tenant_id?: string | null;
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
  isAdminMaster: boolean;
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
  isLoaded: boolean; // Flag to indicate auth+roles have been checked at least once
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionState>(defaultSubscription);
  
  const subCheckRef = useRef(false);
  const fetchInProgressRef = useRef<string | null>(null);

  const fetchData = async (userId: string) => {
    if (fetchInProgressRef.current === userId) {
      console.log(`[AUTH:CORE] Fetch already in progress for user ${userId}, skipping.`);
      return;
    }
    
    fetchInProgressRef.current = userId;
    console.log(`[AUTH:CORE] Fetching profile/roles for user ${userId}...`);
    
    // Add a safety timeout to avoid infinite loading if Supabase hangs
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout fetching auth data")), 15000)
    );

    try {
      const fetchPromise = (async () => {
        // Optimization: select only needed columns to reduce row size/transfer
        const profileColumns = "id, user_id, full_name, avatar_url, phone, whatsapp, marmita_mode, experience_mode, experience_mode_locked, unlock_date, is_orphan, patient_state, onboarding_completed, tenant_id";
        
        const [profileRes, rolesRes] = await Promise.all([
          supabase.from("profiles").select(profileColumns).eq("user_id", userId).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", userId),
        ]);
        
        if (profileRes.error) {
          console.error("[AUTH:CORE] Profile fetch error:", profileRes.error);
          throw profileRes.error;
        }
        if (rolesRes.error) {
          console.error("[AUTH:CORE] Roles fetch error:", rolesRes.error);
          throw rolesRes.error;
        }
        
        return { profile: profileRes.data, roles: rolesRes.data };
      })();

      const result: any = await Promise.race([fetchPromise, timeoutPromise]);
      
      const profileData = result.profile as Profile | null;
      setProfile(profileData);
      
      const newRoles = ((result.roles ?? []).map((r: any) => r.role)) as AppRole[];
      console.log(`[AUTH:CORE] Roles resolved: [${newRoles.join(", ")}]`);
      setRoles(newRoles);

      if (profileData?.tenant_id) {
        setTenantId(profileData.tenant_id);
        const { data: tenantData } = await supabase.from("tenants").select("*").eq("id", profileData.tenant_id).maybeSingle();
        setTenant(tenantData);
      } else {
        setTenantId(null);
        setTenant(null);
      }
    } catch (e: any) {
      console.error("[AUTH:CORE] fetchData failure (recovering with empty roles):", e);
      // Recovery: Unblock the app even if data is missing
      setRoles(prev => prev === null ? [] : prev);
    } finally {
      fetchInProgressRef.current = null;
      setIsLoaded(true);
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
    setProfile(prev => prev ? { ...prev, experience_mode: m } : null);
    const { error } = await supabase
      .from("profiles")
      .update({ experience_mode: m } as any)
      .eq("user_id", user.id);
    if (error) {
      if (import.meta.env.DEV) console.error("Error updating mode:", error);
      await fetchData(user.id);
      throw error;
    }
  };

  // ONE-TIME initialization + Auth Listener
  useEffect(() => {
    let mounted = true;

    const syncSession = async (currentSession: Session | null) => {
      if (!mounted) return;
      
      console.log(`[AUTH:CORE] Syncing session: ${currentSession ? "Authenticated" : "Unauthenticated"}`);
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        try {
          await fetchData(currentUser.id);
        } catch (e) {
          console.error("[AUTH:CORE] Error fetching data during sync:", e);
        }
      } else {
        setProfile(null);
        setRoles([]); // Empty roles for non-authenticated instead of null
        setSubscription(defaultSubscription);
      }
      
      setLoading(false);
    };

    // Initial check
    const initialize = async () => {
      console.log("[AUTH:CORE] Initializing...");
      setLoading(true);
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        await syncSession(initialSession);
      } catch (e) {
        console.error("[AUTH:CORE] Initialization error:", e);
        setLoading(false);
      }
    };

    initialize();

    // Listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log(`[AUTH:CORE] Auth Event: ${event}`);
        
        // Always sync on these major events
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          await syncSession(currentSession);
        }
      }
    );

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
    };
  }, []); // NO dependencies here to avoid loops

  // Profile Realtime Listener (Separate effect)
  useEffect(() => {
    if (!user?.id) return;

    const profileChannel = supabase
      .channel(`auth-profile-${user.id}`)
      .on("postgres_changes", { 
        event: "UPDATE", 
        schema: "public", 
        table: "profiles", 
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
        console.log("[AUTH:CORE] Profile realtime update received");
        setProfile(payload.new as Profile);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);


  const signOut = async () => {
    invalidateMenuCache();
    localStorage.removeItem("fj_workspace_context");
    localStorage.removeItem("fj_last_path");
    sessionStorage.clear();
    await supabase.auth.signOut();
  };

  const authStatus: AuthStatus = loading ? "loading" : error ? "error" : user ? "authenticated" : "unauthenticated";
  const isNutritionist = roles?.includes("nutritionist") ?? false;
  const isPersonal = roles?.includes("personal") ?? false;
  const isAdmin = (roles as string[] | null)?.includes("admin") ?? false;
  const isAdminMaster = (roles as string[] | null)?.includes("admin_master") ?? false;
  const isPatient = roles?.includes("patient") ?? false;
  const isLojista = (roles as string[] | null)?.includes("lojista") ?? false;
  const experienceRole: "nutritionist" | "patient" = (isNutritionist || isPersonal || isAdmin || isAdminMaster) ? "nutritionist" : "patient";
  const experienceMode: "basic" | "pro" | "advanced" = (profile?.experience_mode === "pro" || profile?.experience_mode === "advanced") ? profile.experience_mode as any : "basic";

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
        isAdminMaster,
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
        isLoaded,
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
      isAdminMaster: false,
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
      isLoaded: false,
    };

  }
  return context;
}