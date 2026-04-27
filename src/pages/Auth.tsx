import { forwardRef, useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, Stethoscope, Users, Dumbbell } from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import LanguageSelector from "@/components/common/LanguageSelector";
import { useTranslation } from "react-i18next";

type AuthMode = "login" | "forgot" | "register";
type SelectedRole = "nutritionist" | "personal" | "patient" | null;

const Auth = forwardRef<HTMLDivElement>(function Auth(_, ref) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [selectedRole, setSelectedRole] = useState<SelectedRole>(null);
  const nextPath = searchParams.get("next") || searchParams.get("redirect") || "/";

  // Show error if redirected from no-role sign-out
  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "no_account") {
      toast.error("Sua conta Google não está cadastrada no sistema. Solicite acesso ao seu profissional.", { duration: 8000 });
      // Clean URL
      window.history.replaceState({}, "", "/auth");
    }
  }, [searchParams]);

  // Capture referral data from URL and persist to localStorage
  useEffect(() => {
    const refCode = searchParams.get("ref");
    const invitationCode = searchParams.get("code");
    const nutriId = searchParams.get("nutri");
    
    if (refCode) {
      localStorage.setItem("fitjourney_ref", refCode);
      localStorage.setItem("fitjourney_ref_at", new Date().toISOString());
    }
    if (invitationCode) {
      localStorage.setItem("fitjourney_invite_code", invitationCode);
    }
    if (nutriId) {
      localStorage.setItem("fitjourney_nutri_id", nutriId);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials"
        ? t("auth.invalidCredentials")
        : error.message);
    } else {
      if (!rememberMe) {
        sessionStorage.setItem("fitjourney_session_only", "true");
      } else {
        sessionStorage.removeItem("fitjourney_session_only");
      }
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (currentUser) {
        supabase.rpc("award_points", {
          _patient_id: currentUser.id,
          _action_key: "login",
          _metadata: {},
        });
      }
      navigate(nextPath.startsWith("/") ? nextPath : "/");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { toast.error("Informe seu nome completo"); return; }
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { full_name: fullName, role: "nutritionist" } },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      // Create tenant + profile + role atomically via RPC
      if (data.user) {
        await supabase.rpc("self_register_nutritionist" as any, {
          _user_id: data.user.id,
          _full_name: fullName,
        });
      }
      setRegisterSuccess(true);
      toast.success("Conta criada! Verifique seu e-mail para confirmar.");
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth/confirm?type=recovery&next=/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); }
    else { toast.success(t("auth.recoveryEmailSent")); setMode("login"); }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    console.log(`%c[Auth] Starting OAuth login with ${provider}...`, "color: #3b82f6; font-weight: bold");
    setSocialLoading(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      console.log(`[Auth] OAuth ${provider} trigger result:`, result);
      if (result && 'error' in result && result.error) {
        toast.error(t("auth.socialError"));
      }
    } catch {
      toast.error(t("auth.socialError"));
    }
    setSocialLoading(null);
  };

  return (
    <div ref={ref} className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }} className="mb-4">
            <FitJourneyLogo size="lg" />
          </motion.div>
          <p className="text-muted-foreground mt-1">{t("auth.tagline")}</p>
        </div>

        <Card className="shadow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-center text-foreground">
              {mode === "forgot" ? t("auth.forgotTitle") : mode === "register" ? "Criar Conta Profissional" : t("auth.loginTitle")}
            </h2>
          </CardHeader>

          <CardContent>
            {/* Social login buttons */}
            {mode !== "forgot" && (
              <div className="space-y-3 mb-5">
                <Button variant="outline" className="w-full gap-3 h-11" type="button"
                  disabled={!!socialLoading} onClick={() => handleSocialLogin("google")}>
                  {socialLoading === "google" ? (
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  {t("auth.continueGoogle")}
                </Button>
                <Button variant="outline" className="w-full gap-3 h-11" type="button"
                  disabled={!!socialLoading} onClick={() => handleSocialLogin("apple")}>
                  {socialLoading === "apple" ? (
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                  )}
                  {t("auth.continueApple")}
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-3 text-muted-foreground">{t("auth.orWithEmail")}</span>
                  </div>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {mode === "register" ? (
                registerSuccess ? (
                  <motion.div key="reg-success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6 space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                      <Stethoscope className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">Conta criada com sucesso! 🎉</h3>
                    <p className="text-sm text-muted-foreground">Verifique seu e-mail para confirmar a conta. Depois, faça login para acessar sua plataforma.</p>
                    <Button variant="outline" onClick={() => { setMode("login"); setRegisterSuccess(false); }} className="mt-2">
                      Ir para Login
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="fullName">Nome completo</Label>
                      <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr(a). seu nome" required />
                    </div>
                    <div>
                      <Label htmlFor="email">{t("auth.email")}</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
                    </div>
                    <div>
                      <Label htmlFor="password">{t("auth.password")}</Label>
                      <div className="relative">
                        <Input id="password" type={showPassword ? "text" : "password"} value={password}
                          onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5" /> Conta exclusiva para nutricionistas, personal trainers e profissionais de saúde.
                    </p>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Criando..." : <span className="flex items-center gap-2">Criar Conta <ArrowRight className="w-4 h-4" /></span>}
                    </Button>
                    <button type="button" onClick={() => setMode("login")} className="text-sm text-primary hover:underline w-full text-center">
                      Já tenho conta — fazer login
                    </button>
                  </motion.form>
                )
              ) : mode === "forgot" ? (
                <motion.form key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <Label htmlFor="email">{t("auth.email")}</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t("auth.sending") : t("auth.forgotButton")}
                  </Button>
                  <button type="button" onClick={() => setMode("login")} className="text-sm text-primary hover:underline w-full text-center">
                    {t("auth.backToLogin")}
                  </button>
                </motion.form>
              ) : (
                <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="space-y-4">
                  {/* Interactive role selector */}
                  <p className="text-center text-sm text-muted-foreground mb-1">Selecione sua área para entrar</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: "nutritionist" as SelectedRole, label: t("auth.nutritionist"), icon: Stethoscope, color: "primary" },
                      { key: "personal" as SelectedRole, label: "Personal", icon: Dumbbell, color: "orange-500" },
                      { key: "patient" as SelectedRole, label: t("auth.patient"), icon: Users, color: "accent" },
                    ]).map((role) => {
                      const isActive = selectedRole === role.key;
                      const Icon = role.icon;
                      return (
                        <button
                          key={role.key}
                          type="button"
                          onClick={() => setSelectedRole(isActive ? null : role.key)}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                            isActive
                              ? "border-primary bg-primary/10 shadow-md scale-[1.03]"
                              : "border-border/50 bg-card hover:border-primary/30 hover:bg-primary/5"
                          }`}
                        >
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                            isActive ? "bg-primary/20" : "bg-muted"
                          }`}>
                            <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                            {role.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Collapsible email/password fields */}
                  <AnimatePresence>
                    {selectedRole && (
                      <motion.form
                        key="login-fields"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        onSubmit={handleLogin}
                        className="space-y-4 overflow-hidden"
                      >
                        <div className="pt-1">
                          <Label htmlFor="email">{t("auth.email")}</Label>
                          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required autoFocus />
                        </div>
                        <div>
                          <Label htmlFor="password">{t("auth.password")}</Label>
                          <div className="relative">
                            <Input id="password" type={showPassword ? "text" : "password"} value={password}
                              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Remember me + forgot */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox id="remember" checked={rememberMe} onCheckedChange={(v) => setRememberMe(!!v)} />
                            <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">
                              {t("auth.stayLoggedIn")}
                            </label>
                          </div>
                          <button type="button" onClick={() => setMode("forgot")} className="text-sm text-primary hover:underline">
                            {t("auth.forgotPassword")}
                          </button>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? t("auth.loggingIn") : (
                            <span className="flex items-center gap-2">{t("auth.loginButton")} <ArrowRight className="w-4 h-4" /></span>
                          )}
                        </Button>

                        <div className="pt-2 text-center">
                          <p className="text-xs text-muted-foreground mb-1">É nutricionista ou personal trainer e ainda não tem conta?</p>
                          <button type="button" onClick={() => setMode("register")} className="text-sm text-primary hover:underline font-medium">
                            Criar conta profissional
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {mode === "register"
            ? "Pacientes não podem criar contas. O acesso é concedido por convite do profissional."
            : t("auth.accessNote")}
        </p>

        {/* Biquíni Branco Banner */}
        <Link to="/biquini-branco" className="block mt-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-orange-400/10 border border-pink-500/20 hover:border-pink-500/40 transition-colors cursor-pointer"
          >
            <span className="text-2xl">👙</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t("auth.biquiniBranco")}</p>
              <p className="text-xs text-muted-foreground truncate">{t("auth.biquiniBrancoDesc")}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-pink-500 shrink-0" />
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
});

export default Auth;