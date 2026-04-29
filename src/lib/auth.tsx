import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { invalidateMenuCache } from "@/hooks/useSmartMenu";
import type { Database } from "@/integrations/supabase/types";
import { logAudit } from "@/lib/auditLog";
import { ensureContext } from "@/components/common/SystemShield";
import { useSystemShield } from "@/components/common/SystemShield";

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

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultSubscription: SubscriptionState = {
  subscribed: false,
  subscription_tier: null,
  subscription_end: null,
  is_trial: false,
  trial_end: null,
};

function withAuthTimeout<T>(promise: Promise<T>, label: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      console.warn(`[Auth] Latência detectada em ${label}. Mantendo estado pendente...`);
      // Não resolvemos com fallback, deixamos a promise original decidir.
      // Isso evita assumir que o usuário não existe quando há apenas lentidão.
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timer));
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState>(defaultSubscription);
  const shield = useSystemShield();

  useEffect(() => {
    if (!loading && shield) {
      shield.reportBootStatus("isAuthLoaded", true);
    }
  }, [loading, shield]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile(data);
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles(data?.map((r) => r.role) || []);
  };

  const subCheckRef = useRef(false);
  const checkSubscription = async () => {
    if (subCheckRef.current) return; // deduplicate concurrent calls
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
    } catch (e) {
      console.error("Error checking subscription:", e);
    } finally {
      subCheckRef.current = false;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchRoles(user.id)]);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const correlationId = `auth-init-${Date.now()}`;
      console.log(`[Auth:${correlationId}] Iniciando inicialização determinística...`);
      setLoading(true);
      
      try {
        const { data: { session }, error: sessionError } = await withAuthTimeout(
          supabase.auth.getSession(),
          "sessão inicial"
        );

        if (sessionError) {
          console.error(`[Auth:${correlationId}] Erro ao recuperar sessão:`, sessionError);
        }

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log(`[Auth:${correlationId}] Usuário autenticado: ${session.user.id}. Carregando dados complementares...`);
          // Carregar perfil e roles em paralelo sem travar caso um demore
          await Promise.allSettled([
            fetchProfile(session.user.id),
            fetchRoles(session.user.id),
          ]);
          
          if (mounted) {
            setLoading(false);
            checkSubscription();
            console.log(`[Auth:${correlationId}] Inicialização concluída com sucesso.`);
          }
        } else {
          console.log(`[Auth:${correlationId}] Nenhum usuário encontrado.`);
          if (mounted) setLoading(false);
        }
      } catch (err) {
        console.error(`[Auth:${correlationId}] Falha crítica na inicialização:`, err);
        // Em caso de erro real (não timeout), permitimos liberar o loading para não travar a UI
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Listen for subsequent auth changes (sign in/out, token refresh)
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "INITIAL_SESSION") return;

        // TOKEN_REFRESHED should NOT block UI
        if (event === "SIGNED_IN") {
          setLoading(true);
        }

        if (event === "SIGNED_IN" && session?.user) {
          
          // Log estruturado conforme regra anti-regressão
          logAudit("login", "auth", session.user.id, { 
            email: session.user.email ?? "",
            flow: "login",
            auth_provider: session.user.app_metadata?.provider || "email",
            result: "success"
          });
          
          // Linkage logic moved to DB trigger handle_new_user. 
          // We only clean up local storage here to avoid redundant processing.
          localStorage.removeItem("fitjourney_ref");
          localStorage.removeItem("fitjourney_ref_at");
          localStorage.removeItem("fitjourney_invite_code");
          localStorage.removeItem("fitjourney_nutri_id");
        }
        if (event === "SIGNED_OUT") {
          logAudit("logout", "auth");
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid deadlock with Supabase auth internals
        setTimeout(async () => {
          if (!mounted) return;
          const authEventId = `auth-evt-${Date.now()}`;
          try {
            console.log(`[Auth:${authEventId}] Fetching user data after event: ${event}`);
            const [profileResult, rolesResult] = await Promise.all([
              supabase.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle(),
              supabase.from("user_roles").select("role").eq("user_id", session.user.id),
            ]);
            
            if (profileResult.data) setProfile(profileResult.data);
            
            const userRoles = rolesResult.data?.map((r) => r.role) || [];
            
            if (event === "SIGNED_IN" && userRoles.length === 0) {
              console.log(`[Auth:${authEventId}] Novo usuário detectado. O fluxo de Onboarding / Welcome assumirá a partir daqui.`);
              setRoles([]);
              if (mounted) setLoading(false);
              return;
            }

            setRoles(userRoles);
            if (mounted) {
              setLoading(false);
              checkSubscription();
              // Log final silenciado
            }
          } catch (e) {
            console.error(`[Auth:${authEventId}] Error fetching user data on auth change:`, e);
            if (mounted) setLoading(false);
          }
        }, 50); // Small initial delay to avoid session race
      } else {
        setProfile(null);
        setRoles([]);
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

  const getAuthStatus = (): AuthStatus => {
    if (loading) return "loading";
    return user ? "authenticated" : "unauthenticated";
  };

  const authStatus = getAuthStatus();

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        authStatus,
        isNutritionist: roles.includes("nutritionist"),
        isPersonal: roles.includes("personal"),
        isPatient: roles.includes("patient"),
        isAdmin: (roles as string[]).includes("admin"),
        isLojista: (roles as string[]).includes("lojista"),
        subscription,
        signOut,
        refreshProfile,
        checkSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  // Independent access: if context is missing, return a default guest state
  // to avoid crashing other providers.
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
    };
  }
  return context;
}
