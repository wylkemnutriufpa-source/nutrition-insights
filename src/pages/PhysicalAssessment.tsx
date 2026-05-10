import { useEffect, useState, useMemo, useCallback } from "react";
import { useAppState } from "@/hooks/useAppState";

import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Ruler, Activity, Flame, Target, TrendingDown,
  Calculator, Beef, Wheat, Droplets, Loader2, History, Zap, Scale, Heart, GitCompare, Upload
} from "lucide-react";
import ConsultationCompare from "@/components/patient/ConsultationCompare";
import DocumentUpload from "@/components/common/DocumentUpload";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, AreaChart
} from "recharts";

interface AnamnesisData {
  answers: Record<string, any>;
  computed_tmb: number | null;
  computed_kcal_target: number | null;
  computed_protein: number | null;
  computed_carbs: number | null;
  computed_fat: number | null;
}

interface Assessment {
  id?: string;
  patient_id: string;
  assessor_id: string;
  assessment_date: string;
  weight: string; height: string; bmi: string;
  body_fat_percentage: string; lean_mass: string; fat_mass: string;
  neck: string; chest: string; waist: string; abdomen: string; hip: string;
  right_arm: string; left_arm: string; right_forearm: string; left_forearm: string;
  right_thigh: string; left_thigh: string; right_calf: string; left_calf: string;
  triceps_fold: string; subscapular_fold: string; suprailiac_fold: string;
  abdominal_fold: string; thigh_fold: string; chest_fold: string; midaxillary_fold: string;
  bmr: string; tdee: string; activity_factor: string;
  thermic_effect: string; neat: string;
  protein_target: string; carbs_target: string; fat_target: string; calories_target: string;
  goal_weight: string; goal_body_fat: string;
  notes: string; method: string;
  front_photo_url: string; side_photo_url: string; back_photo_url: string;
}

type SkinfoldMethod = "jackson_pollock_7" | "jackson_pollock_3";

const emptyAssessment = (patientId: string, assessorId: string): Assessment => ({
  patient_id: patientId,
  assessor_id: assessorId,
  assessment_date: new Date().toISOString().split("T")[0],
  weight: "", height: "", bmi: "", body_fat_percentage: "", lean_mass: "", fat_mass: "",
  neck: "", chest: "", waist: "", abdomen: "", hip: "",
  right_arm: "", left_arm: "", right_forearm: "", left_forearm: "",
  right_thigh: "", left_thigh: "", right_calf: "", left_calf: "",
  triceps_fold: "", subscapular_fold: "", suprailiac_fold: "",
  abdominal_fold: "", thigh_fold: "", chest_fold: "", midaxillary_fold: "",
  bmr: "", tdee: "", activity_factor: "1.375",
  thermic_effect: "", neat: "",
  protein_target: "", carbs_target: "", fat_target: "", calories_target: "",
  goal_weight: "", goal_body_fat: "",
  notes: "", method: "jackson_pollock_7",
  front_photo_url: "", side_photo_url: "", back_photo_url: "",
});

const ACTIVITY_FACTORS = [
  { value: "1.2", label: "Sedentário (pouca atividade)" },
  { value: "1.375", label: "Leve (1-3x/semana)" },
  { value: "1.55", label: "Moderado (3-5x/semana)" },
  { value: "1.725", label: "Intenso (6-7x/semana)" },
  { value: "1.9", label: "Muito intenso (atleta)" },
];

function NumField({ label, value, onChange, unit, icon }: {
  label: string; value: string; onChange: (v: string) => void; unit?: string; icon?: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        {icon} {label} {unit && <span className="text-[10px]">({unit})</span>}
      </Label>
      <Input
        type="number" step="0.1" value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 text-sm"
        placeholder="—"
      />
    </div>
  );
}

export default function PhysicalAssessment() {
  const { user } = useAuth();
  const { isReady, isDegraded } = useAppState();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patientId");

  const [form, setForm] = useState<Assessment>(emptyAssessment(patientId || "", user?.id || ""));
  const [anamnesis, setAnamnesis] = useState<AnamnesisData | null>(null);
  const [patientName, setPatientName] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [assessmentDocs, setAssessmentDocs] = useState<any[]>([]);

  const set = useCallback((field: keyof Assessment, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Load anamnesis and patient data
  useEffect(() => {
    if (!patientId) return;

    // Patient name
    supabase.from("profiles").select("full_name").or(`id.eq.${patientId},user_id.eq.${patientId}`).maybeSingle()
      .then(({ data }) => setPatientName(data?.full_name || "Paciente"));

    // Anamnesis
    supabase.from("patient_anamnesis")
      .select("answers, computed_tmb, computed_kcal_target, computed_protein, computed_carbs, computed_fat")
      .or(`user_id.eq.${patientId}`).eq("status", "completed")
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAnamnesis(data as any);
          // Pre-fill from anamnesis
          const a = data.answers as Record<string, any>;
          setForm((prev) => ({
            ...prev,
            weight: a?.weight?.toString() || prev.weight,
            height: a?.height?.toString() || prev.height,
            activity_factor: ({
              sedentary: "1.2", light: "1.375", moderate: "1.55", intense: "1.725"
            } as Record<string, string>)[a?.activity_level] || prev.activity_factor,
          }));
        }
      });

    // History
    setLoadingHistory(true);
    supabase.from("physical_assessments" as any)
      .select("*")
      .eq("patient_id", patientId)
      .order("assessment_date", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setHistory((data as any) || []);
        // Load last assessment
        if (data && data.length > 0) {
          const last = data[0] as any;
          const loaded: any = {};
          for (const key of Object.keys(emptyAssessment("", ""))) {
            if (last[key] !== null && last[key] !== undefined) {
              loaded[key] = last[key].toString();
            }
          }
          loaded.id = last.id;
          loaded.patient_id = patientId;
          loaded.assessor_id = user?.id || "";
          loaded.assessment_date = new Date().toISOString().split("T")[0];
          setForm((prev) => ({ ...prev, ...loaded }));
        }
        setLoadingHistory(false);
      });
  }, [patientId, user]);

  // Fetch assessment documents
  const fetchAssessmentDocs = async () => {
    if (!patientId) return;
    const { data } = await supabase
      .from("patient_documents" as any)
      .select("*")
      .eq("patient_id", patientId)
      .eq("document_type", "assessment")
      .order("created_at", { ascending: false });
    setAssessmentDocs(data || []);
  };

  useEffect(() => { fetchAssessmentDocs(); }, [patientId]);

  // Auto-calculate derived values
  const computed = useMemo(() => {
    const w = parseFloat(form.weight) || 0;
    const h = parseFloat(form.height) || 0;
    const age = anamnesis?.answers?.age || 25;
    const sex = anamnesis?.answers?.sex || "male";
    const af = parseFloat(form.activity_factor) || 1.375;

    // BMI
    const bmi = h > 0 ? w / ((h / 100) ** 2) : 0;

    // BMR (Mifflin-St Jeor)
    let bmr = 0;
    if (w > 0 && h > 0) {
      bmr = sex === "male"
        ? 10 * w + 6.25 * h - 5 * age + 5
        : 10 * w + 6.25 * h - 5 * age - 161;
    }

    // TDEE
    const tdee = bmr * af;

    // TEF (Thermic Effect of Food ~10%)
    const tef = tdee * 0.1;

    // Body fat from skinfolds
    let bodyFat = parseFloat(form.body_fat_percentage) || 0;
    const method = form.method as SkinfoldMethod;
    
    if (method === "jackson_pollock_3") {
      // Jackson-Pollock 3-site
      const threeFolds = sex === "male"
        ? [parseFloat(form.chest_fold), parseFloat(form.abdominal_fold), parseFloat(form.thigh_fold)]
        : [parseFloat(form.triceps_fold), parseFloat(form.suprailiac_fold), parseFloat(form.thigh_fold)];
      const valid3 = threeFolds.filter((f) => f > 0);
      if (valid3.length === 3) {
        const sumFolds = valid3.reduce((s, f) => s + f, 0);
        let density: number;
        if (sex === "male") {
          density = 1.10938 - 0.0008267 * sumFolds + 0.0000016 * sumFolds ** 2 - 0.0002574 * age;
        } else {
          density = 1.0994921 - 0.0009929 * sumFolds + 0.0000023 * sumFolds ** 2 - 0.0001392 * age;
        }
        bodyFat = (495 / density) - 450;
        if (bodyFat < 3) bodyFat = 3;
        if (bodyFat > 60) bodyFat = 60;
      }
    } else {
      // Jackson-Pollock 7-site
      const folds = [
        parseFloat(form.chest_fold), parseFloat(form.abdominal_fold),
        parseFloat(form.thigh_fold), parseFloat(form.triceps_fold),
        parseFloat(form.subscapular_fold), parseFloat(form.suprailiac_fold),
        parseFloat(form.midaxillary_fold)
      ];
      const validFolds = folds.filter((f) => f > 0);
      if (validFolds.length === 7) {
        const sumFolds = validFolds.reduce((s, f) => s + f, 0);
        let density: number;
        if (sex === "male") {
          density = 1.112 - 0.00043499 * sumFolds + 0.00000055 * sumFolds ** 2 - 0.00028826 * age;
        } else {
          density = 1.097 - 0.00046971 * sumFolds + 0.00000056 * sumFolds ** 2 - 0.00012828 * age;
        }
        bodyFat = (495 / density) - 450;
        if (bodyFat < 3) bodyFat = 3;
        if (bodyFat > 60) bodyFat = 60;
      }
    }

    const fatMass = w > 0 && bodyFat > 0 ? w * (bodyFat / 100) : 0;
    const leanMass = w > 0 && bodyFat > 0 ? w - fatMass : 0;

    // Goal-based calories
    const goalW = parseFloat(form.goal_weight) || 0;
    let calTarget = tdee;
    if (goalW > 0 && w > 0) {
      if (goalW < w) calTarget = tdee - 500; // deficit
      else if (goalW > w) calTarget = tdee + 300; // surplus
    }

    // Macros
    const protein = Math.round((calTarget * 0.3) / 4);
    const carbs = Math.round((calTarget * 0.45) / 4);
    const fat = Math.round((calTarget * 0.25) / 9);

    return {
      bmi: Math.round(bmi * 10) / 10,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      tef: Math.round(tef),
      bodyFat: Math.round(bodyFat * 10) / 10,
      fatMass: Math.round(fatMass * 10) / 10,
      leanMass: Math.round(leanMass * 10) / 10,
      calTarget: Math.round(calTarget),
      protein, carbs, fat,
    };
  }, [form.weight, form.height, form.activity_factor, form.body_fat_percentage, form.goal_weight,
      form.chest_fold, form.abdominal_fold, form.thigh_fold, form.triceps_fold,
      form.subscapular_fold, form.suprailiac_fold, form.midaxillary_fold, anamnesis]);

  const getBmiClass = (bmi: number) => {
    if (bmi < 18.5) return { label: "Abaixo do peso", color: "text-blue-400" };
    if (bmi < 25) return { label: "Normal", color: "text-success" };
    if (bmi < 30) return { label: "Sobrepeso", color: "text-amber-400" };
    if (bmi < 35) return { label: "Obesidade I", color: "text-orange-500" };
    if (bmi < 40) return { label: "Obesidade II", color: "text-red-500" };
    return { label: "Obesidade III", color: "text-destructive" };
  };

  const handleSave = async () => {
    if (!user || !patientId) return;
    if (!isReady || isDegraded) {
      console.warn("[FJ:PhysicalAssessment] Save blocked: System not ready or degraded", { isReady, isDegraded });
      toast.error("O sistema ainda está carregando ou em modo limitado. Aguarde um momento.");
      return;
    }
    setSaving(true);


    const payload: any = {
      patient_id: patientId,
      assessor_id: user.id,
      assessment_date: form.assessment_date,
      method: form.method,
      notes: form.notes || null,
      activity_factor: parseFloat(form.activity_factor) || 1.375,
    };

    // Numeric fields
    const numFields = [
      "weight", "height", "neck", "chest", "waist", "abdomen", "hip",
      "right_arm", "left_arm", "right_forearm", "left_forearm",
      "right_thigh", "left_thigh", "right_calf", "left_calf",
      "triceps_fold", "subscapular_fold", "suprailiac_fold",
      "abdominal_fold", "thigh_fold", "chest_fold", "midaxillary_fold",
      "goal_weight", "goal_body_fat",
    ];
    for (const f of numFields) {
      const v = parseFloat((form as any)[f]);
      payload[f] = isNaN(v) ? null : v;
    }

    // Computed fields
    payload.bmi = computed.bmi || null;
    payload.bmr = computed.bmr || null;
    payload.tdee = computed.tdee || null;
    payload.thermic_effect = computed.tef || null;
    payload.body_fat_percentage = computed.bodyFat || null;
    payload.lean_mass = computed.leanMass || null;
    payload.fat_mass = computed.fatMass || null;
    payload.calories_target = computed.calTarget || null;
    payload.protein_target = computed.protein || null;
    payload.carbs_target = computed.carbs || null;
    payload.fat_target = computed.fat || null;

    try {
      if (form.id) {
        const { error } = await supabase.from("physical_assessments" as any)
          .update(payload).eq("id", form.id);
        if (error) throw error;
        toast.success("Avaliação atualizada! ✅");
      } else {
        const { data, error } = await supabase.from("physical_assessments" as any)
          .insert(payload).select("id").single();
        if (error) throw error;
        if (data) setForm((prev) => ({ ...prev, id: (data as any).id }));
        toast.success("Avaliação salva! 📋");
      }

      // Update Central Source of Truth (profiles)
      await supabase.from("profiles").update({
        current_weight_kg: payload.weight,
        current_height_cm: payload.height,
        // Also update targets if relevant
        notes: payload.notes || undefined,
      }).or(`id.eq.${patientId},user_id.eq.${patientId}`);

      // Timeline event
      await supabase.from("patient_timeline").insert({
        patient_id: patientId,
        created_by: user.id,
        event_type: "measurement",
        title: "Avaliação física registrada",
        description: `IMC: ${computed.bmi} • %G: ${computed.bodyFat}% • GET: ${computed.tdee}kcal`,
        metadata: { bmi: computed.bmi, body_fat: computed.bodyFat, tdee: computed.tdee },
      });
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
    setSaving(false);
  };

  if (!patientId) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Paciente não selecionado.</p>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/patients/${patientId}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                <Scale className="w-7 h-7 text-primary" /> Avaliação Física
              </h1>
              <p className="text-muted-foreground text-sm">
                {patientName} • {form.assessment_date && new Date(form.assessment_date + "T12:00:00").toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="gradient-primary gap-2 shadow-glow">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Salvando..." : "Salvar Avaliação"}
            </Button>
          </div>
        </div>

        {/* Anamnesis data banner */}
        {anamnesis && (
          <div className="glass rounded-xl p-4 flex items-center gap-4 flex-wrap">
            <Heart className="w-5 h-5 text-primary shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">Dados da Anamnese:</span>{" "}
              <span className="text-muted-foreground">
                {anamnesis.answers?.weight}kg • {anamnesis.answers?.height}cm •
                TMB: {anamnesis.computed_tmb}kcal • Meta: {anamnesis.computed_kcal_target}kcal
              </span>
            </div>
          </div>
        )}

        {/* Auto-calculated summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <motion.div whileHover={{ y: -2 }} className="glass rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground">IMC</p>
            <p className={`text-2xl font-display font-bold ${computed.bmi > 0 ? getBmiClass(computed.bmi).color : "text-muted-foreground"}`}>
              {computed.bmi > 0 ? computed.bmi : "—"}
            </p>
            {computed.bmi > 0 && <p className={`text-[10px] ${getBmiClass(computed.bmi).color}`}>{getBmiClass(computed.bmi).label}</p>}
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="glass rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground">% Gordura</p>
            <p className="text-2xl font-display font-bold text-orange-400">{computed.bodyFat > 0 ? computed.bodyFat + "%" : "—"}</p>
            {computed.fatMass > 0 && <p className="text-[10px] text-muted-foreground">{computed.fatMass}kg gordura</p>}
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="glass rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground">Massa Magra</p>
            <p className="text-2xl font-display font-bold text-blue-400">{computed.leanMass > 0 ? computed.leanMass + "kg" : "—"}</p>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="glass rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Flame className="w-3 h-3" /> TMB</p>
            <p className="text-2xl font-display font-bold text-red-400">{computed.bmr > 0 ? computed.bmr : "—"}</p>
            <p className="text-[10px] text-muted-foreground">kcal/dia</p>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="glass rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Zap className="w-3 h-3" /> GET</p>
            <p className="text-2xl font-display font-bold text-primary">{computed.tdee > 0 ? computed.tdee : "—"}</p>
            <p className="text-[10px] text-muted-foreground">kcal/dia</p>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="glass rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Target className="w-3 h-3" /> Meta Cal</p>
            <p className="text-2xl font-display font-bold text-success">{computed.calTarget > 0 ? computed.calTarget : "—"}</p>
            <p className="text-[10px] text-muted-foreground">kcal/dia</p>
          </motion.div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {/* Body Measurements */}
          <div className="space-y-4">
            <div className="glass rounded-xl p-5">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" /> Dados Básicos
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumField label="Peso" value={form.weight} onChange={(v) => set("weight", v)} unit="kg" />
                <NumField label="Altura" value={form.height} onChange={(v) => set("height", v)} unit="cm" />
                <NumField label="Peso Meta" value={form.goal_weight} onChange={(v) => set("goal_weight", v)} unit="kg" icon={<Target className="w-3 h-3" />} />
                <NumField label="% Gordura Meta" value={form.goal_body_fat} onChange={(v) => set("goal_body_fat", v)} unit="%" icon={<Target className="w-3 h-3" />} />
              </div>
            </div>

            <div className="glass rounded-xl p-5">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <Ruler className="w-5 h-5 text-primary" /> Circunferências (cm)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumField label="Pescoço" value={form.neck} onChange={(v) => set("neck", v)} unit="cm" />
                <NumField label="Tórax" value={form.chest} onChange={(v) => set("chest", v)} unit="cm" />
                <NumField label="Cintura" value={form.waist} onChange={(v) => set("waist", v)} unit="cm" />
                <NumField label="Abdômen" value={form.abdomen} onChange={(v) => set("abdomen", v)} unit="cm" />
                <NumField label="Quadril" value={form.hip} onChange={(v) => set("hip", v)} unit="cm" />
                <NumField label="Braço D" value={form.right_arm} onChange={(v) => set("right_arm", v)} unit="cm" />
                <NumField label="Braço E" value={form.left_arm} onChange={(v) => set("left_arm", v)} unit="cm" />
                <NumField label="Antebraço D" value={form.right_forearm} onChange={(v) => set("right_forearm", v)} unit="cm" />
                <NumField label="Antebraço E" value={form.left_forearm} onChange={(v) => set("left_forearm", v)} unit="cm" />
                <NumField label="Coxa D" value={form.right_thigh} onChange={(v) => set("right_thigh", v)} unit="cm" />
                <NumField label="Coxa E" value={form.left_thigh} onChange={(v) => set("left_thigh", v)} unit="cm" />
                <NumField label="Panturrilha D" value={form.right_calf} onChange={(v) => set("right_calf", v)} unit="cm" />
                <NumField label="Panturrilha E" value={form.left_calf} onChange={(v) => set("left_calf", v)} unit="cm" />
              </div>
            </div>
          </div>

          {/* Skinfolds */}
          <div className="space-y-4">
            <div className="glass rounded-xl p-5">
              <h3 className="font-display font-semibold mb-2 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-primary" /> Dobras Cutâneas
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <Label className="text-xs text-muted-foreground">Protocolo:</Label>
                <Select value={form.method} onValueChange={(v) => set("method", v)}>
                  <SelectTrigger className="w-[250px] h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jackson_pollock_3">Jackson-Pollock 3 Dobras</SelectItem>
                    <SelectItem value="jackson_pollock_7">Jackson-Pollock 7 Dobras</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {form.method === "jackson_pollock_3" ? (
                <>
                  <p className="text-xs text-muted-foreground mb-4">
                    Protocolo 3 dobras — Homens: Peitoral, Abdominal, Coxa | Mulheres: Tríceps, Suprailíaca, Coxa
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <NumField label="Peitoral" value={form.chest_fold} onChange={(v) => set("chest_fold", v)} unit="mm" />
                    <NumField label="Abdominal" value={form.abdominal_fold} onChange={(v) => set("abdominal_fold", v)} unit="mm" />
                    <NumField label="Coxa" value={form.thigh_fold} onChange={(v) => set("thigh_fold", v)} unit="mm" />
                    <NumField label="Tríceps" value={form.triceps_fold} onChange={(v) => set("triceps_fold", v)} unit="mm" />
                    <NumField label="Suprailíaca" value={form.suprailiac_fold} onChange={(v) => set("suprailiac_fold", v)} unit="mm" />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-4">
                    Preencha todas as 7 dobras para cálculo automático do % de gordura corporal.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <NumField label="Peitoral" value={form.chest_fold} onChange={(v) => set("chest_fold", v)} unit="mm" />
                    <NumField label="Abdominal" value={form.abdominal_fold} onChange={(v) => set("abdominal_fold", v)} unit="mm" />
                    <NumField label="Coxa" value={form.thigh_fold} onChange={(v) => set("thigh_fold", v)} unit="mm" />
                    <NumField label="Tríceps" value={form.triceps_fold} onChange={(v) => set("triceps_fold", v)} unit="mm" />
                    <NumField label="Subescapular" value={form.subscapular_fold} onChange={(v) => set("subscapular_fold", v)} unit="mm" />
                    <NumField label="Suprailíaca" value={form.suprailiac_fold} onChange={(v) => set("suprailiac_fold", v)} unit="mm" />
                    <NumField label="Axilar Média" value={form.midaxillary_fold} onChange={(v) => set("midaxillary_fold", v)} unit="mm" />
                  </div>
                </>
              )}

              {computed.bodyFat > 0 && (
                <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">% Gordura</p>
                      <p className="text-xl font-display font-bold text-orange-400">{computed.bodyFat}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Massa Gorda</p>
                      <p className="text-xl font-display font-bold text-red-400">{computed.fatMass}kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Massa Magra</p>
                      <p className="text-xl font-display font-bold text-blue-400">{computed.leanMass}kg</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <Label className="text-xs text-muted-foreground">Ou insira o % de gordura manualmente:</Label>
                <Input
                  type="number" step="0.1"
                  value={form.body_fat_percentage}
                  onChange={(e) => set("body_fat_percentage", e.target.value)}
                  className="mt-1 max-w-[200px] h-9 text-sm"
                  placeholder="Ex: 18.5"
                />
              </div>
            </div>
          </div>

          {/* Energy Expenditure */}
          <div className="space-y-4">
            <div className="glass rounded-xl p-5">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" /> Gasto Energético Total (GET)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Fator de Atividade</Label>
                    <Select value={form.activity_factor} onValueChange={(v) => set("activity_factor", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_FACTORS.map((af) => (
                          <SelectItem key={af.value} value={af.value}>{af.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 p-4 rounded-lg bg-card border border-border">
                    <h4 className="font-semibold text-sm">Componentes do GET</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1"><Flame className="w-3 h-3 text-red-400" /> TMB (Mifflin-St Jeor)</span>
                        <span className="font-semibold">{computed.bmr} kcal</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3 text-blue-400" /> Fator de Atividade</span>
                        <span className="font-semibold">× {form.activity_factor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" /> ETA (~10%)</span>
                        <span className="font-semibold">{computed.tef} kcal</span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between">
                        <span className="font-semibold flex items-center gap-1"><Flame className="w-4 h-4 text-primary" /> GET Total</span>
                        <span className="font-bold text-primary text-lg">{computed.tdee} kcal</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" /> Meta Calórica Sugerida
                    </h4>
                    <p className="text-3xl font-display font-bold text-primary">{computed.calTarget} kcal/dia</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {parseFloat(form.goal_weight) > 0 && parseFloat(form.weight) > 0
                        ? parseFloat(form.goal_weight) < parseFloat(form.weight)
                          ? "Déficit de 500kcal para emagrecimento"
                          : parseFloat(form.goal_weight) > parseFloat(form.weight)
                            ? "Superávit de 300kcal para ganho de massa"
                            : "Manutenção do peso atual"
                        : "Defina peso meta para ajuste automático"
                      }
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-card border border-border">
                    <h4 className="font-semibold text-sm mb-3">Distribuição de Macronutrientes</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Beef className="w-4 h-4 text-red-400" />
                        <div className="flex-1">
                          <div className="flex justify-between text-sm">
                            <span>Proteína (30%)</span>
                            <span className="font-semibold">{computed.protein}g</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted mt-1">
                            <div className="h-full rounded-full bg-red-400" style={{ width: "30%" }} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Wheat className="w-4 h-4 text-amber-400" />
                        <div className="flex-1">
                          <div className="flex justify-between text-sm">
                            <span>Carboidratos (45%)</span>
                            <span className="font-semibold">{computed.carbs}g</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted mt-1">
                            <div className="h-full rounded-full bg-amber-400" style={{ width: "45%" }} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Droplets className="w-4 h-4 text-blue-400" />
                        <div className="flex-1">
                          <div className="flex justify-between text-sm">
                            <span>Gordura (25%)</span>
                            <span className="font-semibold">{computed.fat}g</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted mt-1">
                            <div className="h-full rounded-full bg-blue-400" style={{ width: "25%" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Label className="text-xs text-muted-foreground">Observações da avaliação</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Anotações sobre a avaliação física..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Photo Upload - 3 mandatory fields */}
          <div className="space-y-4">
            <div className="glass rounded-xl p-5">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                📸 Fotos de Avaliação (Frente / Lado / Costas)
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Registre 3 fotos para acompanhamento visual da evolução corporal.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["front", "side", "back"] as const).map((view) => {
                  const labels = { front: "Frente", side: "Lado", back: "Costas" };
                  const fieldKey = `${view}_photo_url` as keyof Assessment;
                  const url = form[fieldKey];
                  return (
                    <div key={view} className="flex flex-col items-center gap-2">
                      <Label className="text-sm font-medium">{labels[view]}</Label>
                      {url ? (
                        <div className="relative w-full h-48 rounded-xl overflow-hidden border border-border">
                          <img src={url} alt={labels[view]} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => set(fieldKey, "")}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label className="w-full h-48 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-muted/30">
                          <Upload className="w-8 h-8 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Enviar foto {labels[view]}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !patientId) return;
                              const ext = file.name.split(".").pop();
                              const path = `${patientId}/${view}_${Date.now()}.${ext}`;
                              const { error } = await supabase.storage.from("checkin-photos").upload(path, file);
                              if (error) { toast.error("Erro no upload: " + error.message); return; }
                              // Store path in form, not signed URL
                              set(fieldKey, path);
                              toast.success(`Foto ${labels[view]} enviada!`);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Comparison between consultations */}
          <div className="space-y-4">
            {patientId && <ConsultationCompare patientId={patientId} />}
          </div>

          {/* History */}
          <div className="space-y-4">
            <div className="glass rounded-xl p-5">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" /> Histórico de Avaliações
              </h3>
              {loadingHistory ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma avaliação anterior registrada.</p>
              ) : (
                <>
                  {/* Evolution Charts */}
                  {history.length >= 2 && (() => {
                    const chartData = [...history]
                      .sort((a, b) => a.assessment_date.localeCompare(b.assessment_date))
                      .map((h: any) => ({
                        date: new Date(h.assessment_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
                        peso: h.weight ? Number(h.weight) : null,
                        gordura: h.body_fat_percentage ? Number(h.body_fat_percentage) : null,
                        magra: h.lean_mass ? Number(h.lean_mass) : null,
                        imc: h.bmi ? Number(h.bmi) : null,
                        tmb: h.bmr ? Number(h.bmr) : null,
                        get: h.tdee ? Number(h.tdee) : null,
                      }));

                    const first = history[history.length - 1];
                    const last = history[0];
                    const weightDiff = ((last.weight || 0) - (first.weight || 0)).toFixed(1);
                    const fatDiff = ((last.body_fat_percentage || 0) - (first.body_fat_percentage || 0)).toFixed(1);
                    const leanDiff = ((last.lean_mass || 0) - (first.lean_mass || 0)).toFixed(1);

                    return (
                      <div className="space-y-6">
                        {/* Summary badges */}
                        <div className="flex flex-wrap gap-3">
                          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${Number(weightDiff) <= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-orange-500/15 text-orange-400"}`}>
                            Peso: {Number(weightDiff) >= 0 ? "+" : ""}{weightDiff}kg
                          </div>
                          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${Number(fatDiff) <= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-orange-500/15 text-orange-400"}`}>
                            %G: {Number(fatDiff) >= 0 ? "+" : ""}{fatDiff}%
                          </div>
                          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${Number(leanDiff) >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-orange-500/15 text-orange-400"}`}>
                            M.Magra: {Number(leanDiff) >= 0 ? "+" : ""}{leanDiff}kg
                          </div>
                          <div className="px-3 py-1.5 rounded-full text-xs text-muted-foreground bg-muted">
                            desde {new Date(first.assessment_date + "T12:00:00").toLocaleDateString("pt-BR")}
                          </div>
                        </div>

                        {/* Weight Chart */}
                        <div className="glass rounded-xl p-4">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Scale className="w-4 h-4 text-primary" /> Evolução do Peso (kg)
                          </h4>
                          <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id="gradWeight" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                              <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                              <Tooltip
                                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                                labelStyle={{ color: "hsl(var(--foreground))" }}
                              />
                              <Area type="monotone" dataKey="peso" stroke="hsl(var(--primary))" fill="url(#gradWeight)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} name="Peso (kg)" connectNulls />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Body Fat & Lean Mass Chart */}
                        <div className="glass rounded-xl p-4">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-orange-400" /> Composição Corporal
                          </h4>
                          <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                              <Tooltip
                                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                                labelStyle={{ color: "hsl(var(--foreground))" }}
                              />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                              <Line yAxisId="left" type="monotone" dataKey="gordura" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} name="% Gordura" connectNulls />
                              <Line yAxisId="right" type="monotone" dataKey="magra" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 4 }} name="Massa Magra (kg)" connectNulls />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* BMI & Energy Chart */}
                        <div className="glass rounded-xl p-4">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Flame className="w-4 h-4 text-red-400" /> Gasto Energético
                          </h4>
                          <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id="gradTmb" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradGet" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                              <Tooltip
                                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                                labelStyle={{ color: "hsl(var(--foreground))" }}
                              />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                              <Area type="monotone" dataKey="tmb" stroke="#f87171" fill="url(#gradTmb)" strokeWidth={2} dot={{ r: 3 }} name="TMB (kcal)" connectNulls />
                              <Area type="monotone" dataKey="get" stroke="#a78bfa" fill="url(#gradGet)" strokeWidth={2} dot={{ r: 3 }} name="GET (kcal)" connectNulls />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })()}

                  {/* History Table */}
                  <div className={history.length >= 2 ? "mt-6" : ""}>
                    <h4 className="text-sm font-semibold mb-3">Tabela de Avaliações</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2 text-xs text-muted-foreground">Data</th>
                            <th className="text-right py-2 px-2 text-xs text-muted-foreground">Peso</th>
                            <th className="text-right py-2 px-2 text-xs text-muted-foreground">IMC</th>
                            <th className="text-right py-2 px-2 text-xs text-muted-foreground">%G</th>
                            <th className="text-right py-2 px-2 text-xs text-muted-foreground">M.Magra</th>
                            <th className="text-right py-2 px-2 text-xs text-muted-foreground">TMB</th>
                            <th className="text-right py-2 px-2 text-xs text-muted-foreground">GET</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((h: any) => (
                            <tr key={h.id} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-2 px-2">{new Date(h.assessment_date + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                              <td className="py-2 px-2 text-right font-medium">{h.weight ?? "—"}kg</td>
                              <td className="py-2 px-2 text-right">{h.bmi ?? "—"}</td>
                              <td className="py-2 px-2 text-right text-orange-400">{h.body_fat_percentage ? h.body_fat_percentage + "%" : "—"}</td>
                              <td className="py-2 px-2 text-right text-blue-400">{h.lean_mass ? h.lean_mass + "kg" : "—"}</td>
                              <td className="py-2 px-2 text-right">{h.bmr ?? "—"}</td>
                              <td className="py-2 px-2 text-right font-semibold text-primary">{h.tdee ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Documents */}
          <div>
            <div className="glass rounded-xl p-5">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                📎 Documentos da Avaliação Física
              </h3>
              {patientId && user && (
                <DocumentUpload
                  patientId={patientId}
                  nutritionistId={user.id}
                  documentType="assessment"
                  referenceId={form.id}
                  documents={assessmentDocs}
                  onUploadComplete={fetchAssessmentDocs}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
