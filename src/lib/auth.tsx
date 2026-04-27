import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { invalidateMenuCache } from "@/hooks/useSmartMenu";
import type { Database } from "@/integrations/supabase/types";
import { logAudit } from "@/lib/auditLog";

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
}

interface SubscriptionState {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  is_trial: boolean;
  trial_end: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionState>(defaultSubscription);

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
      try {
        console.log(`%c[Auth:${correlationId}] Initializing session...`, "color: #3b82f6; font-weight: bold");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(`%c[Auth:${correlationId}] getSession error:`, "color: #ef4444", sessionError);
        }

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log(`[Auth:${correlationId}] Fetching data for user:`, session.user.id);
          const [profileResult, rolesResult] = await Promise.allSettled([
            fetchProfile(session.user.id),
            fetchRoles(session.user.id),
          ]);
          
          console.log(`[Auth:${correlationId}] Initial fetch complete. Profile:`, 
            profileResult.status === 'fulfilled' ? 'OK' : 'Error',
            'Roles:', rolesResult.status === 'fulfilled' ? 'OK' : 'Error'
          );

          if (mounted) {
            setLoading(false);
            checkSubscription();
          }
        } else {
          if (mounted) setLoading(false);
        }
      } catch (err) {
        console.error(`[Auth:${correlationId}] initializeAuth failed:`, err);
        if (mounted) setLoading(false);
      }
    };
    // Safety net: if loading stays true for >8s, force it off so the UI never gets stuck on a blank/spinner screen
    let loadingWatchdog: ReturnType<typeof setTimeout> | null = null;
    const armWatchdog = () => {
      if (loadingWatchdog) clearTimeout(loadingWatchdog);
      loadingWatchdog = setTimeout(() => {
        if (mounted) {
          console.warn("[Auth] Loading watchdog tripped — forcing loading=false");
          setLoading(false);
        }
      }, 8000);
    };

    // Arm immediately at mount to protect the very first load too
    armWatchdog();

    initializeAuth();

    // Listen for subsequent auth changes (sign in/out, token refresh)
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "INITIAL_SESSION") return;

        // Only flip loading=true on SIGNED_IN. TOKEN_REFRESHED should NOT block UI —
        // refreshing tokens silently in background is normal and shouldn't trigger a splash.
        if (event === "SIGNED_IN") {
          setLoading(true);
          armWatchdog();
        }

        if (event === "SIGNED_IN" && session?.user) {
          console.log(`%c[Auth] User SIGNED_IN: ${session.user.email} (${session.user.id})`, "color: #10b981; font-weight: bold");
          logAudit("login", "auth", session.user.id, { email: session.user.email ?? "" });
          
          // Check for referral/linkage codes and create associations
          const refCode = localStorage.getItem("fitjourney_ref");
          const inviteCode = localStorage.getItem("fitjourney_invite_code");
          const nutriId = localStorage.getItem("fitjourney_nutri_id");

          if ((refCode || inviteCode || nutriId) && session.user.email) {
            (async () => {
              const linkageId = `link-${Date.now()}-${Math.random().toString(36).substring(7)}`;
              try {
                console.log(`[Auth:${linkageId}] Processing linkage for ${session.user.email} with:`, { refCode, inviteCode, nutriId });
                
                let targetNutriId = nutriId;
                let targetTenantId: string | null = null;

                if (inviteCode && !targetNutriId) {
                  const { data: invite } = await (supabase.from("invitations") as any)
                    .select("professional_id, tenant_id")
                    .eq("code", inviteCode)
                    .maybeSingle();
                  if (invite) {
                    targetNutriId = invite.professional_id;
                    targetTenantId = invite.tenant_id;
                    console.log(`[Auth:${linkageId}] Resolved nutritionist from invite code:`, targetNutriId);
                  }
                }

                if (targetNutriId) {
                  if (!targetTenantId) {
                    const { data: tenant } = await (supabase.from("tenants") as any)
                      .select("id")
                      .eq("owner_id", targetNutriId)
                      .maybeSingle();
                    targetTenantId = tenant?.id || null;
                  }

                  if (targetTenantId) {
                    // IDEMPOTENCY: Use maybeSingle check before insert
                    const { data: existingLink } = await (supabase.from("nutritionist_patients") as any)
                      .select("id")
                      .eq("patient_id", session.user.id)
                      .eq("nutritionist_id", targetNutriId)
                      .maybeSingle();

                    if (!existingLink) {
                      console.log(`[Auth:${linkageId}] Creating link in nutritionist_patients...`);
                      const { error: insertError } = await (supabase.from("nutritionist_patients") as any).insert({
                        nutritionist_id: targetNutriId,
                        patient_id: session.user.id,
                        tenant_id: targetTenantId,
                        status: "active",
                        journey_status: "awaiting_consent",
                        attendance_mode: "online"
                      });
                      
                      if (insertError) {
                        console.error(`[Auth:${linkageId}] Failed to insert link:`, insertError);
                      } else {
                        console.log(`[Auth:${linkageId}] Link created successfully`);
                      }
                    } else {
                      console.log(`[Auth:${linkageId}] Link already exists, skipping insert (idempotent).`);
                    }
                  }
                }

                // 2. Affiliate Referral (Legacy/Commission)
                if (refCode) {
                  const { data: affiliate } = await supabase.rpc("lookup_affiliate_by_code", { _code: refCode });
                  if (affiliate && affiliate.length > 0) {
                    const aff = affiliate[0];
                    if (aff.affiliate_id !== session.user.id) {
                      const { data: existing } = await supabase
                        .from("affiliate_referrals")
                        .select("id")
                        .eq("referred_email", session.user.email!.toLowerCase())
                        .limit(1);
                      if (!existing || existing.length === 0) {
                        await supabase.from("affiliate_referrals").insert({
                          affiliate_id: aff.affiliate_id,
                          referred_email: session.user.email!.toLowerCase(),
                          referral_code_used: refCode,
                          referred_user_id: session.user.id,
                          referred_type: "patient",
                          status: "registered",
                        });
                      }
                    }
                  }
                }

                // Cleanup
                localStorage.removeItem("fitjourney_ref");
                localStorage.removeItem("fitjourney_ref_at");
                localStorage.removeItem("fitjourney_invite_code");
                localStorage.removeItem("fitjourney_nutri_id");
              } catch (e) {
                console.error("[Auth] Error in linkage flow:", e);
              }
            })();
          }
        }
        if (event === "SIGNED_OUT") {
          console.log("%c[Auth] User SIGNED_OUT", "color: #f59e0b; font-weight: bold");
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
              console.warn(`[Auth:${authEventId}] User has no roles yet, starting aggressive retry for:`, session.user.email);
              
              const maxRetries = 4;
              let currentRetry = 0;
              
              const retryFetch = async () => {
                currentRetry++;
                console.log(`[Auth:${authEventId}] Retry ${currentRetry}/${maxRetries} to fetch roles...`);
                
                try {
                  const { data: retryRoles } = await (supabase.from("user_roles") as any).select("role").eq("user_id", session.user.id);
                  const retried = retryRoles?.map((r: any) => r.role) || [];
                  
                  if (mounted && retried.length > 0) {
                    setRoles(retried);
                    setLoading(false);
                    checkSubscription();
                    console.log(`[Auth:${authEventId}] Roles found on retry:`, retried);
                    return;
                  }
                  
                  if (currentRetry < maxRetries) {
                    setTimeout(retryFetch, 1000);
                  } else {
                    console.warn(`[Auth:${authEventId}] All role retries exhausted.`);
                    setRoles([]);
                    if (mounted) setLoading(false);
                  }
                } catch (err) {
                  console.error(`[Auth:${authEventId}] Role retry failed:`, err);
                  if (mounted && currentRetry >= maxRetries) setLoading(false);
                }
              };
              
              setTimeout(retryFetch, 500);
              return;
            }

            setRoles(userRoles);
            if (mounted) {
              setLoading(false);
              checkSubscription();
              console.log(`%c[Auth:${authEventId}] Final Auth State:`, "color: #10b981; font-weight: bold", {
                user_id: session.user.id,
                email: session.user.email,
                profile_exists: !!profileResult.data,
                roles: userRoles,
                subscription_active: subscription.subscribed
              });
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
      if (loadingWatchdog) clearTimeout(loadingWatchdog);
      authSubscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    invalidateMenuCache();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
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
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
