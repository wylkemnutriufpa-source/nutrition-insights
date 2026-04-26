import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Eye, EyeOff, ArrowRight, CheckCircle2, Search, Stethoscope, Loader2, UserPlus
} from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";

interface ProfessionalResult {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  clinic_name: string | null;
  phone: string | null;
}

export default function PatientRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || "";
  const preselectedNutri = searchParams.get("nutri") || "";
  const signature = searchParams.get("sig") || "";
  const [sigValid, setSigValid] = useState<boolean | null>(null);

  // Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Professional (optional)
  const [showProfSearch, setShowProfSearch] = useState(!!preselectedNutri);
  const [profSearch, setProfSearch] = useState("");
  const [profResults, setProfResults] = useState<ProfessionalResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalResult | null>(null);

  // Pre-select professional from URL
  useEffect(() => {
    if (!preselectedNutri) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, phone")
        .eq("user_id", preselectedNutri)
        .maybeSingle();
      if (data) {
        setSelectedProfessional({
          user_id: data.user_id,
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          clinic_name: null,
          phone: data.phone,
        });
      }
    })();
  }, [preselectedNutri]);

  // Verify signature if nutri is provided
  useEffect(() => {
    if (!preselectedNutri || !signature) {
      if (preselectedNutri && !signature) {
        setSigValid(false); // No signature provided for a preselected nutri
      }
      return;
    }
    const verifySig = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-registration-token", {
          body: { nutriId: preselectedNutri, signature }
        });
        if (error) throw error;
        setSigValid(data.isValid);
        if (!data.isValid) {
          toast.error("Link de registro inválido ou alterado. Por favor, solicite um novo link ao seu profissional.");
        }
      } catch (err) {
        console.error("Error verifying signature:", err);
      }
    };
    verifySig();
  }, [preselectedNutri, signature]);

  // Search professionals
  const searchProfessionals = useCallback(async (query: string) => {
    if (query.length < 2) { setProfResults([]); return; }
    setSearchLoading(true);
    const { data } = await supabase.rpc("search_professionals" as any, {
      _query: query,
      _limit: 8,
    });
    setProfResults((data as ProfessionalResult[]) || []);
    setSearchLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchProfessionals(profSearch), 300);
    return () => clearTimeout(t);
  }, [profSearch, searchProfessionals]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preselectedNutri && sigValid === false) {
      toast.error("Vínculo de profissional inválido. Use o link oficial fornecido pelo seu profissional.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      const nutriId = selectedProfessional?.user_id || null;

      // ─── FLUXO A: SEM NUTRICIONISTA → cria APENAS LEAD ───
      // Isso evita pacientes órfãos (sem vínculo). O lead é convertido depois pelo profissional.
      if (!nutriId) {
        const { error: leadErr } = await supabase.from("lead_requests").insert({
          // Lead "público" sem dono explícito → usa um pool admin via referral
          // Se não houver referral, registra mesmo assim para análise (nutritionist_id null não permitido,
          // então usa um placeholder admin se existir; senão retorna erro orientando a escolher profissional)
          nutritionist_id: "00000000-0000-0000-0000-000000000000",
          name,
          email: email.trim().toLowerCase(),
          phone: phone || null,
          source: "self_register",
          referral_code: refCode || null,
          message: "Cadastro espontâneo sem nutricionista selecionado.",
        } as any);

        if (leadErr) {
          // Fallback: orienta o usuário a escolher um profissional
          toast.error("Selecione um profissional para concluir o cadastro.");
          setShowProfSearch(true);
          setLoading(false);
          return;
        }

        toast.success("Recebemos seu interesse! Em breve um profissional entrará em contato.");
        setDone(true);
        setLoading(false);
        return;
      }

      // ─── FLUXO B: COM NUTRICIONISTA → função canônica ───
      const { data: session } = await supabase.auth.getSession();
      // Auto-cadastro: precisamos de uma sessão válida para chamar create-patient.
      // Estratégia: faz signUp primeiro (cria auth.users + sessão), depois roteia via canônica.
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });

      if (signUpErr) {
        toast.error(signUpErr.message === "User already registered"
          ? "Este e-mail já está cadastrado. Faça login."
          : signUpErr.message);
        setLoading(false);
        return;
      }

      if (!signUpData.user) {
        toast.error("Falha ao criar conta.");
        setLoading(false);
        return;
      }

      // Chama RPC canônica diretamente (autenticada como o próprio paciente recém-criado)
      const { error: canonErr } = await supabase.rpc("create_patient_canonical" as any, {
        _patient_id: signUpData.user.id,
        _full_name: name,
        _email: email.trim().toLowerCase(),
        _phone: phone || null,
        _nutritionist_id: nutriId,
        _source: "register",
        _metadata: { referral_code: refCode || null },
      });

      if (canonErr) {
        console.error("[PatientRegister] canonical error:", canonErr);
        // Não bloqueia: usuário foi criado, profissional será notificado para reconciliar
      }

      // Notifica o profissional
      try {
        await supabase.from("notifications").insert({
          user_id: nutriId,
          title: "Novo paciente cadastrado",
          message: `${name} se cadastrou e vinculou ao seu perfil.`,
          type: "patient_registered",
          entity_type: "patient",
          entity_id: signUpData.user.id,
          target_route: `/patients/${signUpData.user.id}`,
        } as any);
      } catch (_) {}

      if (signUpData.session) {
        toast.success("Conta criada! Redirecionando para o onboarding...");
        navigate("/consent", { replace: true });
        return;
      }

      toast.success("Conta criada! Verifique seu e-mail para confirmar e iniciar seu onboarding.");
      setDone(true);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar conta. Tente novamente.");
    }
    setLoading(false);
  };

  // ─── Done Screen ───
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="mb-6"><FitJourneyLogo size="lg" /></div>
          <Card className="shadow-card border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">Cadastro Realizado! 🎉</h2>
                <p className="text-muted-foreground text-sm">
                  Verifique seu e-mail para confirmar a conta. Depois, faça login para iniciar sua jornada.
                </p>
              </div>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Ir para Login <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-6">
          <FitJourneyLogo size="lg" />
          <p className="text-muted-foreground mt-2 text-sm">Crie sua conta em segundos</p>
        </div>

        <Card className="shadow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6 pb-6">
            <form onSubmit={handleRegister} className="space-y-4">

              {/* Selected professional badge */}
              {selectedProfessional && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Profissional</p>
                    <p className="font-medium text-sm text-foreground truncate">{selectedProfessional.full_name}</p>
                  </div>
                  {!preselectedNutri && (
                    <button type="button" onClick={() => { setSelectedProfessional(null); setShowProfSearch(true); }}
                      className="text-xs text-primary hover:underline shrink-0">Trocar</button>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div>
                <Label htmlFor="phone">Telefone (opcional)</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Optional: Link to professional */}
              {!selectedProfessional && !preselectedNutri && (
                <>
                  {!showProfSearch ? (
                    <button type="button" onClick={() => setShowProfSearch(true)}
                      className="w-full flex items-center justify-center gap-2 text-sm text-primary hover:underline py-1">
                      <Stethoscope className="w-3.5 h-3.5" /> Vincular a um profissional
                    </button>
                  ) : (
                    <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">Buscar profissional</span>
                        <button type="button" onClick={() => { setShowProfSearch(false); setProfSearch(""); setProfResults([]); }}
                          className="text-xs text-muted-foreground hover:text-foreground">Pular</button>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input value={profSearch} onChange={(e) => setProfSearch(e.target.value)}
                          placeholder="Nome do profissional" className="pl-9 h-9 text-sm" />
                      </div>
                      {searchLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />}
                      {profResults.length > 0 && (
                        <div className="space-y-1 max-h-36 overflow-y-auto">
                          {profResults.map(prof => (
                            <button key={prof.user_id} type="button"
                              onClick={() => { setSelectedProfessional(prof); setShowProfSearch(false); }}
                              className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-primary/10 transition-all text-sm">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary">{prof.full_name?.[0]?.toUpperCase()}</span>
                              </div>
                              <span className="truncate text-foreground">{prof.full_name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {profSearch.length >= 2 && !searchLoading && profResults.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-1">Nenhum encontrado</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {refCode && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    Código de referência: <strong>{refCode}</strong>
                  </span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading || (preselectedNutri && sigValid === null)}>
                {loading || (preselectedNutri && sigValid === null) ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {sigValid === null ? "Validando link..." : "Criando conta..."}</span>
                ) : (
                  <span className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Criar Conta</span>
                )}
              </Button>

              <div className="text-center">
                <Link to="/auth" className="text-sm text-primary hover:underline">
                  Já tenho conta — fazer login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Ao criar sua conta, você concorda com os termos de uso.
        </p>
      </motion.div>
    </div>
  );
}
