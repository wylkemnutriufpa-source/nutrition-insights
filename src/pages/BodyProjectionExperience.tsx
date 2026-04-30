import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, Share2, Download, Shield, ChevronRight, Sparkles,
  TrendingDown, TrendingUp, Minus, Eye, History, Clock, Lock,
  CalendarCheck, Plus, Trash2, AlertTriangle, BarChart3,
  Target, Zap, Brain, Activity, Award
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart
} from "recharts";
import { PROJECTION_DISCLAIMER } from "@/services/bodyProjectionVisualizer";
import { evaluateAccuracy } from "@/services/bodyProjectionEngine";

// ==========================================
// TYPES
// ==========================================

interface BodyData {
  rendering_profile: string;
  adiposity_level: string;
  muscularity_level?: string;
  weight?: number;
  bmi?: number;
  body_fat?: number | null;
  projected_weight?: number;
  projected_bmi?: number;
  projected_body_fat?: number | null;
  weight_delta?: number;
  confidence_score: number;
  clinical_phase?: string;
  projected_phase?: string;
  recommended_strategy?: string;
  metabolic_response_type?: string;
  historical_analysis?: {
    metabolic_response_type: string;
    regain_probability: number;
    plateau_probability: number;
    behavioral_consistency_score: number;
    yoyo_cycles: number;
    has_sufficient_history: boolean;
  };
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
  narrative: string | null;
  confidence_score: number;
  current_metrics_json: any;
  projected_metrics_json: any;
  projected_body_fat: number | null;
  metabolic_adaptation_index: number | null;
  adherence_prediction_score: number | null;
  plateau_risk: number | null;
  visual_state_seed: any;
  projection_accuracy: number | null;
  accuracy_evaluated_at: string | null;
  engine_version: string | null;
}

interface WeightHistoryEntry {
  id?: string;
  weight: number;
  measurement_date: string;
  measurement_source: string;
  body_fat_percentage?: number | null;
  notes?: string | null;
}

// ==========================================
// CONSTANTS
// ==========================================

const ADIPOSITY_CONFIG: Record<string, { label: string; scale: number; glow: string }> = {
  very_high: { label: "Muito Alto", scale: 1.25, glow: "shadow-[0_0_40px_rgba(239,68,68,0.3)]" },
  high: { label: "Alto", scale: 1.15, glow: "shadow-[0_0_30px_rgba(251,146,60,0.3)]" },
  moderate: { label: "Moderado", scale: 1.05, glow: "shadow-[0_0_25px_rgba(250,204,21,0.3)]" },
  low: { label: "Baixo", scale: 0.95, glow: "shadow-[0_0_30px_rgba(74,222,128,0.4)]" },
  very_low: { label: "Muito Baixo", scale: 0.88, glow: "shadow-[0_0_35px_rgba(34,197,94,0.5)]" },
};

const PHASE_LABELS: Record<string, string> = {
  perda_ativa: "Perda Ativa",
  active_loss: "Perda Ativa",
  reducao_gradual: "Redução Gradual",
  slowing_response: "Redução Gradual",
  estabilizacao: "Estabilização",
  consolidation: "Consolidação",
  consolidacao_metabolica: "Consolidação Metabólica",
  recomposicao: "Recomposição",
  plateau_risk: "Risco de Platô",
  plateau_active: "Platô Ativo",
  recovery: "Recuperação",
  maintenance: "Manutenção",
};

const TIMEFRAME_LABELS: Record<string, string> = {
  "30d": "30 dias",
  "90d": "90 dias",
  "180d": "6 meses",
  "365d": "1 ano",
};

const METABOLIC_TYPE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  rapid_responder: { label: "Respondedor Rápido", emoji: "⚡", color: "text-emerald-400" },
  stable_transformer: { label: "Transformador Estável", emoji: "🎯", color: "text-blue-400" },
  slow_responder: { label: "Respondedor Gradual", emoji: "🐢", color: "text-amber-400" },
  plateau_prone: { label: "Propenso a Platô", emoji: "📊", color: "text-orange-400" },
  weight_cycler: { label: "Ciclo Sanfona", emoji: "🔄", color: "text-red-400" },
  behavioral_inconsistent: { label: "Padrão Variável", emoji: "📈", color: "text-purple-400" },
  resistant_metabolism: { label: "Metabolismo Resistente", emoji: "🛡️", color: "text-rose-400" },
  unknown: { label: "Em Análise", emoji: "🔬", color: "text-muted-foreground" },
};

// ==========================================
// BODY SILHOUETTE COMPONENT
// ==========================================

function BodySilhouette({ data, label, isProjection = false }: { data: BodyData; label: string; isProjection?: boolean }) {
  const config = ADIPOSITY_CONFIG[data.adiposity_level] || ADIPOSITY_CONFIG.moderate;
  const isFemale = data.rendering_profile === "female";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex flex-col items-center gap-2">
      <Badge variant="outline" className={`text-xs ${isProjection ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10" : "border-cyan-500/50 text-cyan-400 bg-white/5"}`}>
        {label}
      </Badge>
      <div className={`relative w-28 h-48 flex items-center justify-center ${config.glow} rounded-full`}>
        {[...Array(6)].map((_, i) => (
          <motion.div key={i} className={`absolute w-1 h-1 rounded-full ${isProjection ? "bg-emerald-400" : "bg-cyan-400"}`}
            animate={{ y: [0, -50, 0], opacity: [0, 0.7, 0] }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
            style={{ left: `${20 + i * 10}%`, bottom: "10%" }} />
        ))}
        <motion.svg viewBox="0 0 100 200" className="w-20 h-40" animate={{ scale: config.scale }} transition={{ duration: 0.8 }}>
          <defs>
            <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isProjection ? "#10b981" : "#06b6d4"} stopOpacity="0.9" />
              <stop offset="100%" stopColor={isProjection ? "#047857" : "#0e7490"} stopOpacity="0.5" />
            </linearGradient>
          </defs>
          {isFemale ? (
            <path d="M50 10 C50 10 42 12 40 20 C38 28 38 35 37 42 C33 44 25 50 23 58 C21 66 24 68 28 66 C30 64 32 60 34 58 C34 70 30 85 28 100 C26 108 32 110 38 108 C40 106 42 95 44 90 C46 95 48 106 50 108 C52 106 54 95 56 90 C58 95 60 106 62 108 C68 110 74 108 72 100 C70 85 66 70 66 58 C68 60 70 64 72 66 C76 68 79 66 77 58 C75 50 67 44 63 42 C62 35 62 28 60 20 C58 12 50 10 50 10Z"
              fill={`url(#grad-${label})`} stroke={isProjection ? "#10b981" : "#06b6d4"} strokeWidth="0.5" strokeOpacity="0.5" />
          ) : (
            <path d="M50 10 C50 10 43 12 41 20 C39 28 40 35 39 42 C34 44 24 50 22 58 C20 66 23 68 27 66 C29 64 31 60 33 58 C33 70 31 85 29 100 C27 108 33 110 39 108 C41 106 43 95 45 90 C47 95 48 106 50 108 C52 106 53 95 55 90 C57 95 59 106 61 108 C67 110 73 108 71 100 C69 85 67 70 67 58 C69 60 71 64 73 66 C77 68 80 66 78 58 C76 50 66 44 61 42 C60 35 61 28 59 20 C57 12 50 10 50 10Z"
              fill={`url(#grad-${label})`} stroke={isProjection ? "#10b981" : "#06b6d4"} strokeWidth="0.5" strokeOpacity="0.5" />
          )}
          <circle cx="50" cy="10" r="7" fill={`url(#grad-${label})`} stroke={isProjection ? "#10b981" : "#06b6d4"} strokeWidth="0.5" strokeOpacity="0.4" />
        </motion.svg>
      </div>
      <div className="text-center space-y-0.5">
        <p className="text-base font-bold text-foreground">{data.projected_weight || data.weight || "—"} kg</p>
        <p className="text-[10px] text-muted-foreground">
          IMC {data.projected_bmi || data.bmi || "—"} • {config.label}
          {(data.projected_body_fat || data.body_fat) && ` • ${data.projected_body_fat || data.body_fat}% GC`}
        </p>
        <div className="flex items-center justify-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${data.confidence_score > 0.6 ? "bg-emerald-400" : "bg-yellow-400"}`} />
          <span className="text-[10px] text-muted-foreground">{Math.round(data.confidence_score * 100)}%</span>
        </div>
      </div>
    </motion.div>
  );
}

// ==========================================
// WEIGHT HISTORY FORM
// ==========================================

function WeightHistoryForm({ patientId, onSaved }: { patientId: string; onSaved: () => void }) {
  const [entries, setEntries] = useState<{ weight: string; date: string; bodyFat: string }[]>([
    { weight: "", date: "", bodyFat: "" }
  ]);
  const [saving, setSaving] = useState(false);

  const addRow = () => setEntries(prev => [...prev, { weight: "", date: "", bodyFat: "" }]);
  const removeRow = (i: number) => setEntries(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    const validEntries = entries.filter(e => e.weight && e.date);
    if (validEntries.length === 0) { toast.error("Preencha pelo menos um registro"); return; }
    const today = new Date().toISOString().slice(0, 10);
    for (const entry of validEntries) {
      if (entry.date > today) { toast.error("Datas futuras não são permitidas"); return; }
    }
    const dates = validEntries.map(e => e.date);
    if (new Set(dates).size !== dates.length) { toast.error("Datas duplicadas encontradas"); return; }

    setSaving(true);
    try {
      const rows = validEntries.map(e => ({
        patient_id: patientId,
        weight: parseFloat(e.weight),
        measurement_date: e.date,
        measurement_source: "retrospective",
        body_fat_percentage: e.bodyFat ? parseFloat(e.bodyFat) : null,
      }));
      const { error } = await supabase.from("patient_weight_history").upsert(rows, { onConflict: "patient_id,measurement_date" });
      if (error) throw error;
      toast.success(`${rows.length} registro(s) salvos!`);
      setEntries([{ weight: "", date: "", bodyFat: "" }]);
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card/50 border-border/50 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <History className="w-4 h-4 text-primary" />
        Histórico Retroativo de Peso
      </h3>
      <p className="text-[10px] text-muted-foreground">Adicione registros anteriores para calibrar o motor de projeção.</p>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input type="date" value={entry.date} max={new Date().toISOString().slice(0, 10)}
              onChange={e => { const n = [...entries]; n[i].date = e.target.value; setEntries(n); }}
              className="flex-1 h-8 text-xs" />
            <Input type="number" placeholder="Peso (kg)" value={entry.weight} step="0.1" min="30" max="300"
              onChange={e => { const n = [...entries]; n[i].weight = e.target.value; setEntries(n); }}
              className="w-24 h-8 text-xs" />
            <Input type="number" placeholder="% GC" value={entry.bodyFat} step="0.1" min="3" max="60"
              onChange={e => { const n = [...entries]; n[i].bodyFat = e.target.value; setEntries(n); }}
              className="w-20 h-8 text-xs" />
            {entries.length > 1 && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeRow(i)}>
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={addRow}>
          <Plus className="w-3 h-3 mr-1" /> Adicionar
        </Button>
        <Button size="sm" className="text-xs h-7 bg-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Registros"}
        </Button>
      </div>
    </Card>
  );
}

// ==========================================
// PROJECTION CHART
// ==========================================

function ProjectionChart({ snapshots, weightHistory }: { snapshots: Snapshot[]; weightHistory: WeightHistoryEntry[] }) {
  const chartData = useMemo(() => {
    const points: { date: string; label: string; weight: number; type: "history" | "current" | "projection" }[] = [];
    for (const wh of weightHistory) {
      points.push({ date: wh.measurement_date, label: format(new Date(wh.measurement_date), "MMM/yy", { locale: ptBR }), weight: wh.weight, type: "history" });
    }
    const latestGroup = snapshots.filter(s => s.created_at === snapshots[0]?.created_at?.slice(0, 10) || true);
    if (latestGroup.length > 0) {
      const current = latestGroup[0].current_body_json;
      if (current?.weight) {
        points.push({ date: new Date().toISOString().slice(0, 10), label: "Hoje", weight: current.weight, type: "current" });
      }
    }
    const latestByTf = new Map<string, Snapshot>();
    for (const snap of snapshots) {
      if (!latestByTf.has(snap.timeframe)) latestByTf.set(snap.timeframe, snap);
    }
    for (const tf of ["30d", "90d", "180d", "365d"]) {
      const snap = latestByTf.get(tf);
      if (snap?.projected_body_json?.projected_weight) {
        const days = parseInt(tf) || 90;
        const futureDate = new Date(Date.now() + days * 86400000);
        points.push({ date: futureDate.toISOString().slice(0, 10), label: TIMEFRAME_LABELS[tf] || tf, weight: snap.projected_body_json.projected_weight, type: "projection" });
      }
    }
    points.sort((a, b) => a.date.localeCompare(b.date));
    return points;
  }, [snapshots, weightHistory]);

  if (chartData.length < 2) return null;

  return (
    <Card className="bg-card/50 border-border/50 p-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-primary" />
        Trajetória Passado → Presente → Futuro
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={["dataMin - 2", "dataMax + 2"]} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(value: number) => [`${value} kg`, "Peso"]} />
          <Area type="monotone" dataKey="weight" stroke="hsl(var(--primary))" fill="url(#projGrad)" strokeWidth={2} dot={(props: any) => {
            const { cx, cy, payload } = props;
            const color = payload.type === "projection" ? "#10b981" : payload.type === "current" ? "hsl(var(--primary))" : "#94a3b8";
            return <circle cx={cx} cy={cy} r={payload.type === "current" ? 5 : 4} fill={color} stroke="none" />;
          }} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-400" /><span className="text-[10px] text-muted-foreground">Histórico</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /><span className="text-[10px] text-muted-foreground">Atual</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-muted-foreground">Projeção</span></div>
      </div>
    </Card>
  );
}

// ==========================================
// ADVANCED METRICS PANEL
// ==========================================

function AdvancedMetrics({ snap }: { snap: Snapshot }) {
  const hist = snap.projected_body_json?.historical_analysis;
  const metType = hist?.metabolic_response_type || snap.current_body_json?.metabolic_response_type;
  const metInfo = METABOLIC_TYPE_LABELS[metType || "unknown"] || METABOLIC_TYPE_LABELS.unknown;

  return (
    <Card className="bg-card/50 border-border/50 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" />
        Inteligência Metabólica
      </h3>

      {/* Metabolic profile */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
        <span className="text-lg">{metInfo.emoji}</span>
        <div className="flex-1">
          <p className={`text-xs font-semibold ${metInfo.color}`}>{metInfo.label}</p>
          <p className="text-[10px] text-muted-foreground">Perfil metabólico baseado em seu histórico</p>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {snap.metabolic_adaptation_index !== null && (
          <div className="p-2 rounded-lg bg-white/5">
            <div className="flex items-center gap-1 mb-1">
              <Activity className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] text-muted-foreground">Adaptação Metabólica</span>
            </div>
            <p className="text-sm font-bold text-foreground">{Math.round((snap.metabolic_adaptation_index || 1) * 100)}%</p>
          </div>
        )}
        {snap.plateau_risk !== null && (
          <div className="p-2 rounded-lg bg-white/5">
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-muted-foreground">Risco de Platô</span>
            </div>
            <p className="text-sm font-bold text-foreground">{Math.round((snap.plateau_risk || 0) * 100)}%</p>
          </div>
        )}
        {snap.adherence_prediction_score !== null && (
          <div className="p-2 rounded-lg bg-white/5">
            <div className="flex items-center gap-1 mb-1">
              <Target className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-muted-foreground">Adesão Prevista</span>
            </div>
            <p className="text-sm font-bold text-foreground">{Math.round(snap.adherence_prediction_score || 0)}%</p>
          </div>
        )}
        {snap.projected_body_fat !== null && (
          <div className="p-2 rounded-lg bg-white/5">
            <div className="flex items-center gap-1 mb-1">
              <Zap className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] text-muted-foreground">% Gordura Projetada</span>
            </div>
            <p className="text-sm font-bold text-foreground">{snap.projected_body_fat}%</p>
          </div>
        )}
      </div>

      {/* Historical stats */}
      {hist?.has_sufficient_history && (
        <div className="text-[10px] text-muted-foreground border-t border-border/30 pt-2 space-y-1">
          <p>🔄 Ciclos sanfona: {hist.yoyo_cycles || 0}</p>
          <p>📊 Prob. platô: {Math.round((hist.plateau_probability || 0) * 100)}%</p>
          <p>⚠️ Prob. recuperação: {Math.round((hist.regain_probability || 0) * 100)}%</p>
          <p>🎯 Consistência: {Math.round((hist.behavioral_consistency_score || 0) * 100)}%</p>
        </div>
      )}
    </Card>
  );
}

// ==========================================
// PROJECTION vs ACTUAL COMPARISON
// ==========================================

function ProjectionVsActual({ snapshots }: { snapshots: Snapshot[] }) {
  const evaluated = snapshots.filter(s => s.projection_accuracy !== null && s.timeframe === "90d");
  if (evaluated.length === 0) return null;

  return (
    <Card className="bg-card/50 border-border/50 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Award className="w-4 h-4 text-amber-400" />
        Projeção vs Realidade
      </h3>
      <p className="text-[10px] text-muted-foreground">"Meu futuro previsto está se tornando real"</p>
      <div className="space-y-2">
        {evaluated.slice(0, 5).map(snap => {
          const acc = snap.projection_accuracy || 0;
          const verdict = acc >= 90 ? "🏆 Elite" : acc >= 70 ? "✅ Atingida" : acc >= 50 ? "📊 Próxima" : "⚠️ Divergente";
          const color = acc >= 90 ? "text-amber-400" : acc >= 70 ? "text-emerald-400" : acc >= 50 ? "text-blue-400" : "text-orange-400";
          return (
            <div key={snap.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
              <div>
                <p className="text-xs text-foreground">{format(new Date(snap.created_at), "dd/MM/yy", { locale: ptBR })}</p>
                <p className="text-[10px] text-muted-foreground">{snap.projected_body_json?.projected_weight}kg projetado</p>
              </div>
              <div className="text-right">
                <p className={`text-xs font-bold ${color}`}>{Math.round(acc)}% precisão</p>
                <p className="text-[10px] text-muted-foreground">{verdict}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================

export default function BodyProjectionExperience() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightHistoryEntry[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("90d");
  const [showHistory, setShowHistory] = useState(false);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [cooldownInfo, setCooldownInfo] = useState<{ locked_until: string; eligible: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [snapRes, histRes] = await Promise.all([
        supabase.from("body_projection_snapshots").select("*").eq("patient_id", user.id)
          .order("created_at", { ascending: false }).limit(50),
        supabase.from("patient_weight_history").select("*").eq("patient_id", user.id)
          .order("measurement_date", { ascending: true }).limit(200),
      ]);
      const snaps = (snapRes.data || []) as unknown as Snapshot[];
      setSnapshots(snaps);
      setWeightHistory((histRes.data || []) as unknown as WeightHistoryEntry[]);
      if (snaps.length > 0) {
        const latest = snaps[0];
        const lockedUntil = latest.locked_until;
        const isEligible = !lockedUntil || new Date(lockedUntil) <= new Date();
        setCooldownInfo({ locked_until: lockedUntil || "", eligible: isEligible });
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
        body: { patient_id: user.id, timeframe: "90d", generation_source: "patient_request", generate_all_timeframes: true },
      });
      if (error) throw error;
      if (data?.error === "cooldown_active") {
        setCooldownInfo({ locked_until: data.locked_until, eligible: false });
        toast.error("Projeção em período de espera");
        return;
      }
      toast.success("Projeções geradas pelo FitJourney Intelligence Engine!");
      await loadData();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao gerar projeção");
    } finally {
      setGenerating(false);
    }
  };

  const latestByTimeframe = useMemo(() => {
    const map = new Map<string, Snapshot>();
    for (const snap of snapshots) {
      if (!map.has(snap.timeframe)) map.set(snap.timeframe, snap);
    }
    return map;
  }, [snapshots]);

  const activeSnap = latestByTimeframe.get(selectedTimeframe) || snapshots[0] || null;
  const current = activeSnap?.current_body_json;
  const projected = activeSnap?.projected_body_json;
  const narrative = latestByTimeframe.get("90d")?.narrative || activeSnap?.narrative || null;

  const trendIcon = projected?.weight_delta
    ? projected.weight_delta < -1 ? <TrendingDown className="w-4 h-4 text-emerald-400" />
    : projected.weight_delta > 1 ? <TrendingUp className="w-4 h-4 text-orange-400" />
    : <Minus className="w-4 h-4 text-yellow-400" />
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-emerald-950/10 relative overflow-hidden">
      {/* Background particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
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
          <p className="text-[10px] text-muted-foreground">
            FitJourney Intelligence Engine v{activeSnap?.engine_version || "2.0.0"} • Motor Determinístico + IA Visual
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowWeightForm(!showWeightForm)} className="text-muted-foreground">
          <Plus className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setShowHistory(!showHistory)} className="text-muted-foreground">
          <History className="w-5 h-5" />
        </Button>
      </div>

      {/* Guardrail */}
      <AnimatePresence>
        {showDisclaimer && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mx-4 mb-3">
            <Card className="bg-amber-500/10 border-amber-500/30 p-3">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-amber-300 font-medium">Guardrail Clínico</p>
                  <p className="text-[10px] text-amber-300/80 mt-0.5">{PROJECTION_DISCLAIMER.short}</p>
                  <Button variant="ghost" size="sm" className="text-[10px] text-amber-400 mt-1 h-5 px-2" onClick={() => setShowDisclaimer(false)}>Entendi</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cooldown */}
      {activeSnap && (
        <div className="mx-4 mb-3">
          <Card className="bg-card/50 border-primary/20 p-3 flex items-center gap-3">
            <CalendarCheck className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground truncate">
                Gerada em {format(new Date(activeSnap.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {cooldownInfo?.eligible ? "✅ Nova projeção disponível" : cooldownInfo?.locked_until ? `🔒 Próxima em ${formatDistanceToNow(new Date(cooldownInfo.locked_until), { locale: ptBR })}` : ""}
              </p>
            </div>
            {cooldownInfo && !cooldownInfo.eligible && <Lock className="w-4 h-4 text-muted-foreground shrink-0" />}
          </Card>
        </div>
      )}

      {/* Weight form */}
      <AnimatePresence>
        {showWeightForm && user && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mx-4 mb-3">
            <WeightHistoryForm patientId={user.id} onSaved={loadData} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* History panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mx-4 mb-3">
            <Card className="bg-card/50 border-border/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> Linha do Tempo de Projeções
              </h3>
              {snapshots.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma projeção salva</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {snapshots.slice(0, 20).map((snap) => (
                    <button key={snap.id} onClick={() => { setSelectedTimeframe(snap.timeframe); setShowHistory(false); }}
                      className={`w-full text-left p-2 rounded-lg transition-colors ${snap.id === activeSnap?.id ? "bg-primary/20 border border-primary/30" : "bg-white/5 hover:bg-white/10"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">{format(new Date(snap.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                        <Badge variant="outline" className="text-[10px]">{TIMEFRAME_LABELS[snap.timeframe] || snap.timeframe}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-muted-foreground">
                          {snap.generation_source === "assessment" ? "📋 Avaliação" : snap.generation_source === "professional_override" ? "👨‍⚕️ Profissional" : "📊 Manual"}
                        </p>
                        {snap.projection_accuracy !== null && (
                          <Badge className={`text-[9px] h-4 ${snap.projection_accuracy >= 70 ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                            {Math.round(snap.projection_accuracy)}% precisão
                          </Badge>
                        )}
                      </div>
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
          <motion.div className="w-16 h-16 border-2 border-primary/30 border-t-primary rounded-full"
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          <p className="text-sm text-muted-foreground">Carregando projeções...</p>
        </div>
      ) : activeSnap && current && projected ? (
        <div className="px-4 space-y-4 pb-20">
          {/* Timeframe selector */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["30d", "90d", "180d", "365d"] as const).map(tf => {
              const snap = latestByTimeframe.get(tf);
              const isActive = selectedTimeframe === tf;
              return (
                <button key={tf} onClick={() => snap && setSelectedTimeframe(tf)} disabled={!snap}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive ? "bg-primary text-primary-foreground shadow-md" :
                    snap ? "bg-card/50 border border-border/50 text-foreground hover:bg-primary/10" :
                    "bg-card/20 text-muted-foreground/50 cursor-not-allowed"
                  }`}>
                  {TIMEFRAME_LABELS[tf]}
                  {snap && <span className="ml-1 text-[10px] opacity-70">{Math.round(snap.confidence_score * 100)}%</span>}
                </button>
              );
            })}
          </div>

          {/* Body comparison */}
          <Card className="bg-card/50 border-primary/20 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
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
                <ChevronRight className="w-5 h-5 text-primary/60" />
                <span className="text-[10px] text-primary/60">{TIMEFRAME_LABELS[selectedTimeframe]}</span>
              </motion.div>
              <BodySilhouette data={projected} label="PROJEÇÃO" isProjection />
            </div>
          </Card>

          {/* Chart */}
          <ProjectionChart snapshots={snapshots} weightHistory={weightHistory} />

          {/* Multi-timeframe grid */}
          <div className="grid grid-cols-2 gap-2">
            {(["30d", "90d", "180d", "365d"] as const).map(tf => {
              const snap = latestByTimeframe.get(tf);
              if (!snap) return null;
              const p = snap.projected_body_json;
              return (
                <Card key={tf} className={`p-3 cursor-pointer transition-all ${selectedTimeframe === tf ? "bg-primary/10 border-primary/30" : "bg-card/50 border-border/50 hover:border-primary/20"}`}
                  onClick={() => setSelectedTimeframe(tf)}>
                  <p className="text-[10px] text-muted-foreground">{TIMEFRAME_LABELS[tf]}</p>
                  <p className="text-lg font-bold text-foreground">{p?.projected_weight || "—"} kg</p>
                  <p className="text-[10px] text-muted-foreground">
                    {p?.weight_delta ? `${p.weight_delta > 0 ? "+" : ""}${p.weight_delta}kg` : "—"} • {Math.round(snap.confidence_score * 100)}%
                  </p>
                  {snap.plateau_risk !== null && (
                    <p className="text-[9px] text-amber-400/70 mt-0.5">Platô: {Math.round((snap.plateau_risk || 0) * 100)}%</p>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Advanced metrics */}
          <AdvancedMetrics snap={activeSnap} />

          {/* Projection vs Actual */}
          <ProjectionVsActual snapshots={snapshots} />

          {/* Phase & strategy */}
          {(current.clinical_phase || projected.projected_phase) && (
            <Card className="bg-card/50 border-border/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fase Atual</p>
                  <p className="text-sm font-semibold text-foreground">{PHASE_LABELS[current.clinical_phase || ""] || current.clinical_phase}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-primary/40" />
                <div className="flex-1 text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fase Projetada</p>
                  <p className="text-sm font-semibold text-emerald-400">{PHASE_LABELS[projected.projected_phase || ""] || projected.projected_phase}</p>
                </div>
              </div>
              {projected.recommended_strategy && (
                <p className="text-xs text-muted-foreground mt-3 border-t border-border/30 pt-3">💡 {projected.recommended_strategy}</p>
              )}
            </Card>
          )}

          {/* Narrative */}
          {narrative && (
            <Card className="bg-card/50 border-border/50 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Narrativa Clínica</h2>
                <Badge variant="outline" className="text-[9px] h-4">IA + Motor Clínico</Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{narrative}</p>
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              disabled={generating || (cooldownInfo ? !cooldownInfo.eligible : false)}
              onClick={requestNewProjection}>
              {generating ? (
                <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                  animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
              ) : cooldownInfo && !cooldownInfo.eligible ? (
                <Lock className="w-4 h-4 mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {cooldownInfo && !cooldownInfo.eligible ? "Projeção em espera (30 dias)" : "Gerar Nova Projeção Completa"}
            </Button>
            <div className="flex gap-3">
              <Button className="flex-1" variant="outline" onClick={() => setShowShareModal(true)}>
                <Share2 className="w-4 h-4 mr-2" /> Compartilhar
              </Button>
              <Button variant="outline" onClick={() => navigate("/journey")}>Minha História</Button>
            </div>
          </div>

          {/* Data info */}
          <Card className="bg-card/30 border-border/30 p-3">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>{PROJECTION_DISCLAIMER.legal}</span>
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col items-center py-20 gap-4 px-4">
          <Sparkles className="w-12 h-12 text-primary/30" />
          <p className="text-sm text-muted-foreground text-center">Nenhuma projeção corporal disponível</p>
          <p className="text-xs text-muted-foreground text-center">Adicione seu histórico de peso e gere sua primeira projeção.</p>
          {user && (
            <div className="w-full max-w-sm space-y-3">
              <WeightHistoryForm patientId={user.id} onSaved={loadData} />
              <Button onClick={requestNewProjection} disabled={generating} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {generating ? "Gerando..." : "Gerar Primeira Projeção"}
              </Button>
            </div>
          )}
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
              <Card className="bg-card border-primary/30 p-6 space-y-4">
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
