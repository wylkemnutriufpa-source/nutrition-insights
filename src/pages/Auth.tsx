import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Leaf, ArrowRight, Sparkles, Stethoscope, Users } from "lucide-react";

type AuthMode = "login" | "signup" | "forgot";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials"
        ? "Email ou senha incorretos"
        : error.message);
    } else {
      if (!rememberMe) {
        // If not "remember me", store a flag so we can clear on tab close
        sessionStorage.setItem("fitjourney_session_only", "true");
      } else {
        sessionStorage.removeItem("fitjourney_session_only");
      }
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { toast.error("Informe seu nome completo"); return; }
    if (password.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from("user_roles").insert({ user_id: data.user.id, role: "nutritionist" });
    }
    setLoading(false);
    toast.success("Conta criada! Verifique seu email para confirmar.");
    setMode("login");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); }
    else { toast.success("Email de recuperação enviado!"); setMode("login"); }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setSocialLoading(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result && 'error' in result && result.error) {
        toast.error(`Erro ao entrar com ${provider === "google" ? "Google" : "Apple"}`);
      }
    } catch {
      toast.error("Erro na autenticação social");
    }
    setSocialLoading(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg mb-4">
            <Leaf className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-3xl font-bold font-display text-foreground">
            Nutri<span className="text-primary">Flow</span>
          </h1>
          <p className="text-muted-foreground mt-1">Nutrição inteligente & gamificada</p>
        </div>

        <Card className="shadow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex gap-1 p-1 rounded-lg bg-muted">
              {(["login", "signup"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {m === "login" ? "Entrar" : "Cadastrar"}
                </button>
              ))}
            </div>
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
                  Continuar com Google
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
                  Continuar com Apple
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-3 text-muted-foreground">ou com email</span>
                  </div>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {mode === "forgot" ? (
                <motion.form key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar link de recuperação"}
                  </Button>
                  <button type="button" onClick={() => setMode("login")} className="text-sm text-primary hover:underline w-full text-center">
                    Voltar ao login
                  </button>
                </motion.form>
              ) : mode === "login" ? (
                <motion.form key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleLogin} className="space-y-4">
                  {/* Role indicator */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Stethoscope className="w-3.5 h-3.5" /><span>Nutricionista</span>
                      </div>
                      <span className="text-border">|</span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /><span>Paciente</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
                  </div>
                  <div>
                    <Label htmlFor="password">Senha</Label>
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
                        Manter conectado
                      </label>
                    </div>
                    <button type="button" onClick={() => setMode("forgot")} className="text-sm text-primary hover:underline">
                      Esqueceu a senha?
                    </button>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Entrando..." : (
                      <span className="flex items-center gap-2">Entrar <ArrowRight className="w-4 h-4" /></span>
                    )}
                  </Button>
                </motion.form>
              ) : (
                <motion.form key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleSignup} className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Stethoscope className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Cadastro para Nutricionistas</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pacientes são cadastrados pelo seu nutricionista e recebem acesso automaticamente.
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="fullName">Nome completo</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr(a). Seu Nome" required />
                  </div>
                  <div>
                    <Label htmlFor="email2">Email profissional</Label>
                    <Input id="email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
                  </div>
                  <div>
                    <Label htmlFor="password2">Senha</Label>
                    <div className="relative">
                      <Input id="password2" type={showPassword ? "text" : "password"} value={password}
                        onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Criando conta..." : (
                      <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Criar Conta Profissional</span>
                    )}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          É paciente? Peça ao seu nutricionista para criar seu acesso.
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
              <p className="text-sm font-semibold text-foreground">Projeto Biquíni Branco</p>
              <p className="text-xs text-muted-foreground truncate">Transformação em 12 semanas — Conheça o programa →</p>
            </div>
            <ArrowRight className="w-4 h-4 text-pink-500 shrink-0" />
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}
