import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { invalidateMenuCache } from "@/hooks/useSmartMenu";
import type { Database } from "@/integrations/supabase/types";
import { logAudit } from "@/lib/auditLog";
import { ensureContext } from "@/components/common/SystemShield";
import { useSystemShield } from "@/components/common/SystemShield";
import { logError } from "@/lib/monitoring";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultSubscription: SubscriptionState = {
  subscribed: false,
  subscription_tier: null,
  subscription_end: null,
  is_trial: false,
  trial_end: null,
};

// withAuthTimeout removido. O sistema agora deve aguardar a resposta real do backend
// para garantir previsibilidade e evitar estados falsos.


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true); // Começa como true para evitar flickers
  const [error, setError] = useState<Error | null>(null);
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
    } catch (e: any) {
      logError("auth_error", "subscription", "Erro ao verificar assinatura", { error: e.message });
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
      setError(null);
      
      // Safety watchdog: Force loading state to end if it hangs for more than 8s
      const authTimeout = setTimeout(() => {
        if (mounted) {
          console.warn(`[Auth:${correlationId}] TIMEOUT DE SEGURANÇA: Finalizando estado de loading forçadamente.`);
          setLoading(false);
        }
      }, 8000);
      
      // Timer de segurança removido para evitar auto-cura. 
      // O sistema deve falhar via ErrorBoundary ou timeout nativo do navegador.


      try {
        console.log(`[Auth:${correlationId}] Buscando sessão inicial do Supabase...`);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();


        if (sessionError) {
          throw sessionError;
        }

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log(`[Auth:${correlationId}] Usuário autenticado: ${session.user.id}. Carregando dados...`);
          
          await Promise.all([
            fetchProfile(session.user.id),
            fetchRoles(session.user.id),
          ]);

          if (mounted) {
            clearTimeout(authTimeout);
            setLoading(false);
            checkSubscription();
            console.log(`[Auth:${correlationId}] Inicialização concluída com sucesso.`);
          }
        } else {
          console.log(`[Auth:${correlationId}] Nenhum usuário encontrado.`);
          clearTimeout(authTimeout);
          if (mounted) {
            setLoading(false);
          }
        }
      } catch (err: any) {
        logError("auth_error", "initialization", err.message, { correlationId }, err.stack);
        console.error(`[Auth:${correlationId}] FALHA NA INICIALIZAÇÃO:`, err);
        // ... keep existing code
        if (mounted) {
          clearTimeout(authTimeout);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for subsequent auth changes (sign in/out, token refresh)
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "INITIAL_SESSION") return;

        const authEventId = `auth-evt-${Date.now()}`;
        console.log(`[Auth:${authEventId}] Evento detectado: ${event}`);

        if (event === "SIGNED_IN") {
          setLoading(true);
          console.log(`[Auth:${authEventId}] Login detectado. Bloqueando UI para sincronização...`);
        }

        if (event === "SIGNED_IN" && session?.user) {
          const selectedRole = localStorage.getItem("fj_selected_role");
          
          logAudit("login", "auth", session.user.id, { 
            email: session.user.email ?? "",
            flow: "login",
            auth_provider: session.user.app_metadata?.provider || "email",
            selected_role: selectedRole,
            result: "success"
          });

          // Se temos uma intenção de role (ex: via Google Login) e o usuário não tem role ainda
          if (selectedRole && (selectedRole === "nutritionist" || selectedRole === "personal")) {
            console.log(`[Auth:${authEventId}] Sincronizando role intencional: ${selectedRole}`);
            // Chamamos a RPC para garantir que o perfil e tenant sejam criados
            supabase.rpc("self_register_nutritionist" as any, {
              _user_id: session.user.id,
              _full_name: session.user.user_metadata?.full_name || "Profissional"
            }).then(() => {
              console.log(`[Auth:${authEventId}] Auto-registro concluído.`);
              refreshProfile();
            });
          }
          
          localStorage.removeItem("fitjourney_ref");
          localStorage.removeItem("fitjourney_ref_at");
          localStorage.removeItem("fitjourney_invite_code");
          localStorage.removeItem("fitjourney_nutri_id");
          localStorage.removeItem("fj_selected_role");
        }

        if (event === "SIGNED_OUT") {
          logAudit("logout", "auth");
          console.log(`[Auth:${authEventId}] Logout realizado.`);
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            if (!mounted) return;
            try {
              console.log(`[Auth:${authEventId}] Sincronizando Perfil e Roles...`);
              const [profileResult, rolesResult] = await Promise.all([
                supabase.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle(),
                supabase.from("user_roles").select("role").eq("user_id", session.user.id),
              ]);
              
              if (profileResult.data) {
                setProfile(profileResult.data);
                console.log(`[Auth:${authEventId}] Perfil carregado.`);
              }
              
              const userRoles = rolesResult.data?.map((r) => r.role) || [];
              setRoles(userRoles);
              console.log(`[Auth:${authEventId}] Roles carregadas:`, userRoles);
              
              if (mounted) {
                setLoading(false);
                checkSubscription();
                console.log(`[Auth:${authEventId}] Estado pronto.`);
              }
            } catch (e) {
              console.error(`[Auth:${authEventId}] Erro na sincronização pós-evento:`, e);
              if (mounted) setLoading(false);
            }
          }, 50);
        } else {
          setProfile(null);
          setRoles([]);
          setLoading(false);
          console.log(`[Auth:${authEventId}] Estado de convidado limpo.`);
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
    if (error) return "error";
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
        error,
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
      error: null,
    };
  }
  return context;
}
