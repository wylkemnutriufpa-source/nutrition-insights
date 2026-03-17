import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Share2, Download, Shield, ChevronRight, Sparkles,
  TrendingDown, TrendingUp, Minus, Eye, History, Clock, Lock, CalendarCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BodyData {
  rendering_profile: string;
  adiposity_level: string;
  muscularity_level?: string;
  weight?: number;
  bmi?: number;
  projected_weight?: number;
  projected_bmi?: number;
  weight_delta?: number;
  confidence_score: number;
  clinical_phase?: string;
  projected_phase?: string;
  recommended_strategy?: string;
}

interface Snapshot {
  id: string;
  created_at: string;
  timeframe: string;
  valid_until: string | null;
  locked_until: string | null;
  generation_source: string;
  current_body_json: BodyData;
  projected_body_json: BodyData;
  narrative: string;
  confidence_score: number;
}

const ADIPOSITY_CONFIG: Record<string, { label: string; scale: number; glow: string }> = {
  very_high: { label: "Muito Alto", scale: 1.25, glow: "shadow-[0_0_40px_rgba(239,68,68,0.3)]" },
  high: { label: "Alto", scale: 1.15, glow: "shadow-[0_0_30px_rgba(251,146,60,0.3)]" },
  moderate: { label: "Moderado", scale: 1.05, glow: "shadow-[0_0_25px_rgba(250,204,21,0.3)]" },
  low: { label: "Baixo", scale: 0.95, glow: "shadow-[0_0_30px_rgba(74,222,128,0.4)]" },
  very_low: { label: "Muito Baixo", scale: 0.88, glow: "shadow-[0_0_35px_rgba(34,197,94,0.5)]" },
};

const PHASE_LABELS: Record<string, string> = {
  perda_ativa: "Perda Ativa",
  reducao_gradual: "Redução Gradual",
  estabilizacao: "Estabilização",
  recomposicao: "Recomposição",
};

function BodySilhouette({ data, label, isProjection = false }: { data: BodyData; label: string; isProjection?: boolean }) {
  const config = ADIPOSITY_CONFIG[data.adiposity_level] || ADIPOSITY_CONFIG.moderate;
  const isFemale = data.rendering_profile === "female";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex flex-col items-center gap-3">
      <Badge variant="outline" className={`border-emerald-500/50 text-emerald-400 text-xs ${isProjection ? "bg-emerald-500/10" : "bg-white/5"}`}>
        {label}
      </Badge>
      <div className={`relative w-32 h-56 flex items-center justify-center ${config.glow} rounded-full`}>
        {[...Array(8)].map((_, i) => (
          <motion.div key={i} className={`absolute w-1 h-1 rounded-full ${isProjection ? "bg-emerald-400" : "bg-cyan-400"}`}
            animate={{ y: [0, -60, 0], x: [0, Math.sin(i) * 20, 0], opacity: [0, 0.8, 0] }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
            style={{ left: `${20 + i * 8}%`, bottom: "10%" }} />
        ))}
        <motion.svg viewBox="0 0 100 200" className="w-24 h-48" animate={{ scale: config.scale }} transition={{ duration: 0.8, ease: "easeInOut" }}>
          <defs>
            <linearGradient id={`bodyGrad-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isProjection ? "#10b981" : "#06b6d4"} stopOpacity="0.9" />
              <stop offset="50%" stopColor={isProjection ? "#059669" : "#0891b2"} stopOpacity="0.7" />
              <stop offset="100%" stopColor={isProjection ? "#047857" : "#0e7490"} stopOpacity="0.5" />
            </linearGradient>
            <filter id={`glow-${label}`}><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {isFemale ? (
            <path d="M50 10 C50 10 42 12 40 20 C38 28 38 35 37 42 C33 44 25 50 23 58 C21 66 24 68 28 66 C30 64 32 60 34 58 C34 70 30 85 28 100 C26 108 32 110 38 108 C40 106 42 95 44 90 C46 95 48 106 50 108 C52 106 54 95 56 90 C58 95 60 106 62 108 C68 110 74 108 72 100 C70 85 66 70 66 58 C68 60 70 64 72 66 C76 68 79 66 77 58 C75 50 67 44 63 42 C62 35 62 28 60 20 C58 12 50 10 50 10Z"
              fill={`url(#bodyGrad-${label})`} filter={`url(#glow-${label})`} stroke={isProjection ? "#10b981" : "#06b6d4"} strokeWidth="0.5" strokeOpacity="0.5" />
          ) : (
            <path d="M50 10 C50 10 43 12 41 20 C39 28 40 35 39 42 C34 44 24 50 22 58 C20 66 23 68 27 66 C29 64 31 60 33 58 C33 70 31 85 29 100 C27 108 33 110 39 108 C41 106 43 95 45 90 C47 95 48 106 50 108 C52 106 53 95 55 90 C57 95 59 106 61 108 C67 110 73 108 71 100 C69 85 67 70 67 58 C69 60 71 64 73 66 C77 68 80 66 78 58 C76 50 66 44 61 42 C60 35 61 28 59 20 C57 12 50 10 50 10Z"
              fill={`url(#bodyGrad-${label})`} filter={`url(#glow-${label})`} stroke={isProjection ? "#10b981" : "#06b6d4"} strokeWidth="0.5" strokeOpacity="0.5" />
          )}
          {isProjection && (
            <motion.line x1="50" y1="5" x2="50" y2="195" stroke="#10b981" strokeWidth="0.3" strokeOpacity="0.3"
              strokeDasharray="4 4" animate={{ strokeDashoffset: [0, -8] }} transition={{ duration: 1, repeat: Infinity }} />
          )}
          <circle cx="50" cy="10" r="7" fill={`url(#bodyGrad-${label})`} filter={`url(#glow-${label})`}
            stroke={isProjection ? "#10b981" : "#06b6d4"} strokeWidth="0.5" strokeOpacity="0.4" />
        </motion.svg>
      </div>
      <div className="text-center space-y-1">
        <p className="text-lg font-bold text-foreground">{data.projected_weight || data.weight || "—"} kg</p>
        <p className="text-xs text-muted-foreground">IMC {data.projected_bmi || data.bmi || "—"} • {config.label}</p>
        <div className="flex items-center justify-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${data.confidence_score > 0.6 ? "bg-emerald-400" : "bg-yellow-400"}`} />
          <span className="text-[10px] text-muted-foreground">Confiança {Math.round(data.confidence_score * 100)}%</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function BodyProjectionExperience() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeSnapshot, setActiveSnapshot] = useState<Snapshot | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [cooldownInfo, setCooldownInfo] = useState<{ locked_until: string; eligible: boolean } | null>(null);

  // Load saved projection + history
  useEffect(() => {
    if (!user) return;
    loadProjections();
  }, [user]);

  const loadProjections = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("body_projection_snapshots")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const snapshots = (data || []) as unknown as Snapshot[];
      setHistory(snapshots);

      if (snapshots.length > 0) {
        const latest = snapshots[0];
        setActiveSnapshot(latest);

        // Check cooldown
        const lockedUntil = latest.locked_until;
        const isEligible = !lockedUntil || new Date(lockedUntil) <= new Date();
        setCooldownInfo({
          locked_until: lockedUntil || "",
          eligible: isEligible,
        });
      } else {
        setCooldownInfo({ locked_until: "", eligible: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const requestNewProjection = async () => {
    if (!user) return;
    if (cooldownInfo && !cooldownInfo.eligible) {
      toast.error("Projeção em período de espera. Aguarde a próxima janela.");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-body-projection", {
        body: { patient_id: user.id, timeframe: "90d", generation_source: "patient_request" },
      });

      if (error) throw error;

      if (data?.error === "cooldown_active") {
        setCooldownInfo({ locked_until: data.locked_until, eligible: false });
        toast.error("Projeção em período de espera");
        return;
      }

      toast.success("Nova projeção gerada!");
      await loadProjections();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao gerar projeção");
    } finally {
      setGenerating(false);
    }
  };

  const viewSnapshot = (snap: Snapshot) => {
    setActiveSnapshot(snap);
    setShowHistory(false);
  };

  const current = activeSnapshot?.current_body_json;
  const projected = activeSnapshot?.projected_body_json;

  const trendIcon = projected?.weight_delta
    ? projected.weight_delta < -1 ? <TrendingDown className="w-4 h-4 text-emerald-400" />
    : projected.weight_delta > 1 ? <TrendingUp className="w-4 h-4 text-orange-400" />
    : <Minus className="w-4 h-4 text-yellow-400" />
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-emerald-950/10 relative overflow-hidden">
      {/* Background particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div key={i} className="absolute w-0.5 h-0.5 bg-emerald-400/30 rounded-full"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ opacity: [0, 0.5, 0], y: [0, -30, 0] }}
            transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }} />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Body Future Engine
          </h1>
          <p className="text-xs text-muted-foreground">Projeção Corporal Inteligente</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowHistory(!showHistory)} className="text-muted-foreground">
          <History className="w-5 h-5" />
        </Button>
      </div>

      {/* Disclaimer */}
      <AnimatePresence>
        {showDisclaimer && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mx-4 mb-4">
            <Card className="bg-amber-500/10 border-amber-500/30 p-3">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-amber-300">Esta visualização é uma estimativa baseada nos seus dados atuais e serve para acompanhamento motivacional e estratégico. Não substitui avaliação clínica profissional.</p>
                  <Button variant="ghost" size="sm" className="text-xs text-amber-400 mt-1 h-6 px-2" onClick={() => setShowDisclaimer(false)}>Entendi</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cooldown / Status bar */}
      {activeSnapshot && (
        <div className="mx-4 mb-4">
          <Card className="bg-card/50 border-emerald-500/20 p-3 flex items-center gap-3">
            <CalendarCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground truncate">
                Gerada em {format(new Date(activeSnapshot.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {cooldownInfo?.eligible
                  ? "✅ Nova projeção disponível"
                  : cooldownInfo?.locked_until
                  ? `🔒 Próxima disponível em ${formatDistanceToNow(new Date(cooldownInfo.locked_until), { locale: ptBR })}`
                  : ""}
              </p>
            </div>
            {cooldownInfo && !cooldownInfo.eligible && (
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </Card>
        </div>
      )}

      {/* History panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mx-4 mb-4">
            <Card className="bg-card/50 border-emerald-500/20 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                Projeções Anteriores
              </h3>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma projeção salva</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {history.map((snap) => (
                    <button
                      key={snap.id}
                      onClick={() => viewSnapshot(snap)}
                      className={`w-full text-left p-2 rounded-lg transition-colors ${snap.id === activeSnapshot?.id ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-white/5 hover:bg-white/10"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">
                          {format(new Date(snap.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                          {snap.timeframe}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {snap.generation_source === "assessment" ? "📋 Avaliação física" 
                          : snap.generation_source === "reassessment" ? "🔄 Reavaliação"
                          : snap.generation_source === "body_analysis" ? "📸 Análise corporal"
                          : snap.generation_source === "professional_override" ? "👨‍⚕️ Profissional"
                          : "📊 Solicitação manual"} • Confiança {Math.round(snap.confidence_score * 100)}%
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <motion.div className="w-16 h-16 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full"
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          <p className="text-sm text-muted-foreground">Carregando projeções...</p>
        </div>
      ) : activeSnapshot && current && projected ? (
        <div className="px-4 space-y-6 pb-20">
          {/* Body comparison */}
          <Card className="bg-card/50 border-emerald-500/20 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Comparação Corporal</h2>
              <div className="flex items-center gap-1.5">
                {trendIcon}
                <span className="text-xs text-muted-foreground">
                  {projected.weight_delta ? `${projected.weight_delta > 0 ? "+" : ""}${projected.weight_delta}kg` : "—"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-around">
              <BodySilhouette data={current} label="HOJE" />
              <motion.div className="flex flex-col items-center gap-1" animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <ChevronRight className="w-6 h-6 text-emerald-400/60" />
                <span className="text-[10px] text-emerald-400/60">{activeSnapshot.timeframe}</span>
              </motion.div>
              <BodySilhouette data={projected} label="PROJEÇÃO" isProjection />
            </div>
          </Card>

          {/* Clinical phase */}
          {(current.clinical_phase || projected.projected_phase) && (
            <Card className="bg-card/50 border-emerald-500/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fase Atual</p>
                  <p className="text-sm font-semibold text-foreground">{PHASE_LABELS[current.clinical_phase || ""] || current.clinical_phase}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-400/40" />
                <div className="flex-1 text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fase Projetada</p>
                  <p className="text-sm font-semibold text-emerald-400">{PHASE_LABELS[projected.projected_phase || ""] || projected.projected_phase}</p>
                </div>
              </div>
              {projected.recommended_strategy && (
                <p className="text-xs text-muted-foreground mt-3 border-t border-border/30 pt-3">
                  💡 {projected.recommended_strategy}
                </p>
              )}
            </Card>
          )}

          {/* Clinical narrative */}
          <Card className="bg-card/50 border-emerald-500/20 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-foreground">Análise Clínica</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{activeSnapshot.narrative}</p>
          </Card>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-card/50 border-emerald-500/20 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{current.weight || "—"}</p>
              <p className="text-xs text-muted-foreground">Peso Atual (kg)</p>
            </Card>
            <Card className="bg-card/50 border-emerald-500/20 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{projected.projected_weight || "—"}</p>
              <p className="text-xs text-muted-foreground">Peso Projetado (kg)</p>
            </Card>
            <Card className="bg-card/50 border-emerald-500/20 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{current.bmi || "—"}</p>
              <p className="text-xs text-muted-foreground">IMC Atual</p>
            </Card>
            <Card className="bg-card/50 border-emerald-500/20 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{projected.projected_bmi || "—"}</p>
              <p className="text-xs text-muted-foreground">IMC Projetado</p>
            </Card>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              disabled={generating || (cooldownInfo ? !cooldownInfo.eligible : false)}
              onClick={requestNewProjection}
            >
              {generating ? (
                <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                  animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
              ) : cooldownInfo && !cooldownInfo.eligible ? (
                <Lock className="w-4 h-4 mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {cooldownInfo && !cooldownInfo.eligible ? "Projeção em espera" : "Solicitar Nova Projeção"}
            </Button>

            <div className="flex gap-3">
              <Button className="flex-1" variant="outline" onClick={() => setShowShareModal(true)}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
              <Button variant="outline" onClick={() => navigate("/my-story")}>
                Minha História
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-20 gap-4 px-4">
          <Sparkles className="w-12 h-12 text-emerald-400/30" />
          <p className="text-sm text-muted-foreground text-center">Nenhuma projeção corporal disponível</p>
          <p className="text-xs text-muted-foreground text-center">Sua primeira projeção será gerada após avaliação física ou solicitação do profissional.</p>
          <Button onClick={requestNewProjection} disabled={generating} className="bg-emerald-600 hover:bg-emerald-700">
            {generating ? "Gerando..." : "Gerar Primeira Projeção"}
          </Button>
        </div>
      )}

      {/* Share modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center p-4"
            onClick={() => setShowShareModal(false)}>
            <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
              className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <Card className="bg-card border-emerald-500/30 p-6 space-y-4">
                <h3 className="text-lg font-bold text-foreground">Compartilhar Evolução</h3>
                <p className="text-xs text-amber-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Confirmo que desejo compartilhar meus dados de projeção.
                </p>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { toast.success("Evolução compartilhada!"); setShowShareModal(false); }}>
                    Story Instagram
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => { toast.success("Imagem salva!"); setShowShareModal(false); }}>
                    <Download className="w-4 h-4 mr-1" /> Salvar
                  </Button>
                </div>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setShowShareModal(false)}>Cancelar</Button>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
