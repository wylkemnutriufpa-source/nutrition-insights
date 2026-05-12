/**
 * Patient-facing Intelligence Dashboard — Golden Premium panel
 * Shows their Intelligence status, behavioral profile, and recent prompts.
 */
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { usePrestige } from "@/hooks/usePrestige";
import { motion } from "framer-motion";
import { Brain, Sparkles, Droplets, Dumbbell, Moon, MessageSquare, Crown, Lock, Shield, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import IntelligenceShowcaseModal from "@/components/intelligence/IntelligenceShowcaseModal";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

function GoldenParticles() {
  const particles = Array.from({ length: 15 }, (_, i) => ({
    x: `${10 + Math.random() * 80}%`,
    y: `${10 + Math.random() * 80}%`,
    size: 1 + Math.random() * 2,
    delay: Math.random() * 5,
    dur: 4 + Math.random() * 6,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: p.x, top: p.y, width: p.size, height: p.size,
            background: "hsl(45 100% 60% / 0.4)",
          }}
          animate={{ y: [0, -20, 0], opacity: [0.1, 0.5, 0.1] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

const MODULES = [
  { icon: Droplets, label: "Hidratação", desc: "Lembretes de água adaptados ao seu dia", color: "text-blue-400", bg: "bg-blue-500/10" },
  { icon: Dumbbell, label: "Treino", desc: "Avisos no seu horário ideal de atividade", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: Moon, label: "Fim de Semana", desc: "Proteção contra riscos alimentares", color: "text-violet-400", bg: "bg-violet-500/10" },
  { icon: MessageSquare, label: "Puxão de Orelha", desc: "Feedback emocional progressivo", color: "text-rose-400", bg: "bg-rose-500/10" },
  { icon: Sparkles, label: "Motivação", desc: "Mensagens no tom certo pra você", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { icon: Shield, label: "Alertas Clínicos", desc: "Avisos baseados no seu perfil de saúde", color: "text-amber-400", bg: "bg-amber-500/10" },
];

export default function PatientIntelligence() {
  const { user, profile } = useAuth();
  const { prestige } = usePrestige();
  const [stats, setStats] = useState({ totalInteractions: 0, engagedCount: 0, hydrationToday: 0 });
  const [showUpgrade, setShowUpgrade] = useState(false);

  const isEnabled = (profile as any)?.fit_intelligence_enabled === true;
  const isOnboarded = (profile as any)?.fit_intelligence_onboarded === true;
  const isPremiumPrestige = prestige.plan?.slug === "premium" || prestige.plan?.slug === "pro" || prestige.plan?.slug === "gold";
  const hasAccess = isEnabled || isPremiumPrestige; // Premium prestige = auto-access

  // Check expiry
  const expiresAt = (profile as any)?.fit_intelligence_expires_at;
  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  const canUse = hasAccess && !isExpired;

  useEffect(() => {
    if (!user || !canUse) return;
    (async () => {
      const [interactionsRes, freqRes, hydrationRes] = await Promise.all([
        supabase.from("fit_intelligence_interactions" as any).select("id", { count: "exact", head: true }).eq("patient_id", user.id),
        supabase.from("fit_intelligence_frequency" as any).select("engaged_count").eq("patient_id", user.id).maybeSingle(),
        supabase.from("fit_intelligence_hydration" as any).select("consumed_cups").eq("patient_id", user.id).eq("date", new Date().toISOString().split("T")[0]).maybeSingle(),
      ]);
      setStats({
        totalInteractions: interactionsRes.count || 0,
        engagedCount: (freqRes.data as any)?.engaged_count || 0,
        hydrationToday: (hydrationRes.data as any)?.consumed_cups || 0,
      });
    })();
  }, [user, canUse]);

  // Not enabled — show premium showcase
  if (!hasAccess || isExpired) {
    return (
      <DashboardLayout>
        <div className="relative max-w-2xl mx-auto space-y-6 pt-4">
          <GoldenParticles />

          {/* Premium locked header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: EASE_PREMIUM }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "linear-gradient(135deg, hsl(35 40% 8%) 0%, hsl(40 30% 12%) 50%, hsl(30 35% 8%) 100%)" }}
            >
              <div className="relative p-8 text-center space-y-4">
                <motion.div
                  className="absolute top-0 right-0 w-60 h-60 rounded-full blur-3xl pointer-events-none"
                  style={{ background: "radial-gradient(circle, hsl(45 100% 50% / 0.15), transparent)" }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
                <motion.div
                  className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, hsl(45 100% 45%), hsl(35 100% 35%))",
                    boxShadow: "0 0 40px hsl(45 100% 50% / 0.3)",
                  }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  <Brain className="w-10 h-10 text-amber-950" />
                </motion.div>

                <h1 className="text-2xl font-bold"
                  style={{
                    background: "linear-gradient(180deg, #FFD700 0%, #FFFACD 50%, #FFD700 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Inteligência FitJourney
                </h1>
                <p className="text-sm text-amber-200/50 max-w-md mx-auto">
                  {isExpired 
                    ? "Seu acesso à Inteligência FitJourney expirou. Fale com seu nutricionista para renovar!"
                    : "Seu copiloto comportamental pessoal. Fale com seu nutricionista para ativar este recurso exclusivo!"
                  }
                </p>

                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 gap-1 text-xs">
                  <Crown className="w-3 h-3" /> Recurso Premium
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Feature preview grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, ease: EASE_PREMIUM }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {MODULES.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
              >
                <Card className="border-amber-500/10 bg-card/60 backdrop-blur-sm opacity-70">
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center flex-shrink-0`}>
                      <m.icon className={`w-4 h-4 ${m.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold">{m.label}</p>
                        <Lock className="w-3 h-3 text-muted-foreground/40" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 p-4 rounded-xl border border-amber-500/20"
            style={{ background: "hsl(45 100% 50% / 0.03)" }}
          >
            <Lock className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-muted-foreground flex-1">
              Este recurso é exclusivo para pacientes com <span className="font-semibold text-amber-500">Prestígio Premium</span> ou liberação individual pelo nutricionista.
            </p>
          </motion.div>
        </div>
        <IntelligenceShowcaseModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </DashboardLayout>
    );
  }

  // Enabled — show golden dashboard
  return (
    <DashboardLayout>
      <div className="relative max-w-2xl mx-auto space-y-6 pt-4">
        <GoldenParticles />

        {/* Golden Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: EASE_PREMIUM }}
        >
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, hsl(35 40% 8%) 0%, hsl(40 30% 12%) 50%, hsl(30 35% 8%) 100%)" }}
          >
            <div className="relative p-6 flex items-center gap-4">
              <motion.div
                className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle, hsl(45 100% 50% / 0.15), transparent)" }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 relative z-10"
                style={{
                  background: "linear-gradient(135deg, hsl(45 100% 45%), hsl(35 100% 35%))",
                  boxShadow: "0 0 20px hsl(45 100% 50% / 0.3)",
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <Brain className="w-7 h-7 text-amber-950" />
              </motion.div>
              <div className="relative z-10">
                <h1 className="text-lg font-bold"
                  style={{
                    background: "linear-gradient(180deg, #FFD700 0%, #FFFACD 50%, #FFD700 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Inteligência FitJourney
                </h1>
                <p className="text-xs text-amber-200/50">Seu copiloto comportamental de saúde</p>
              </div>
              <div className="ml-auto flex items-center gap-2 relative z-10">
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 gap-1 text-[10px]">
                  <Zap className="w-3 h-3" /> Ativa
                </Badge>
                {isOnboarded && (
                  <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">
                    Configurada
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, ease: EASE_PREMIUM }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: "Interações", value: stats.totalInteractions, icon: MessageSquare, color: "text-amber-500" },
            { label: "Engajamentos", value: stats.engagedCount, icon: Sparkles, color: "text-emerald-400" },
            { label: "Água Hoje", value: `${stats.hydrationToday} 🥤`, icon: Droplets, color: "text-blue-400" },
          ].map((s, i) => (
            <Card key={s.label} className="border-amber-500/10 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Active modules */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, ease: EASE_PREMIUM }}
        >
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{
              background: "linear-gradient(90deg, #FFD700, #FFA500)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            <Zap className="w-4 h-4 text-amber-500" /> Módulos Ativos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODULES.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
              >
                <Card className="border-amber-500/15 bg-card/80 backdrop-blur-sm hover:border-amber-500/30 transition-colors">
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center flex-shrink-0`}>
                      <m.icon className={`w-4 h-4 ${m.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{m.label}</p>
                      <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Expiry info */}
        {expiresAt && !isExpired && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/20"
            style={{ background: "hsl(45 100% 50% / 0.03)" }}
          >
            <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Acesso ativo até <span className="font-semibold text-foreground">{new Date(expiresAt).toLocaleDateString("pt-BR")}</span>
            </p>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
