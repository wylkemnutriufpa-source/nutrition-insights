import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Upload, Loader2, Brain, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import { useAIUsage } from "@/hooks/useAIUsage";
import AIUsageBadge from "@/components/common/AIUsageBadge";

type MealType = Database["public"]["Enums"]["meal_type"];

const mealTypes: { value: MealType; label: string }[] = [
  { value: "Café da Manhã", label: "☕ Café da manhã" },
  { value: "Lanche da Manhã", label: "🍌 Lanche da manhã" },
  { value: "Almoço", label: "🍽️ Almoço" },
  { value: "Lanche da Tarde", label: "🍎 Lanche da tarde" },
  { value: "Jantar", label: "🌙 Jantar" },
  { value: "Ceia", label: "🫖 Ceia" },
];

interface AnalysisResult {
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  score: number;
  feedback: string;
}

export default function AnalyzeMeal() {
  const { user } = useAuth();
  const aiUsage = useAIUsage("analyze_meal");
  const [description, setDescription] = useState("");
  const [mealType, setMealType] = useState<MealType>("Almoço");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saving, setSaving] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const analyze = async () => {
    if (!description.trim() && !imageFile) {
      toast.error("Descreva a refeição ou envie uma foto");
      return;
    }
    if (!aiUsage.allowed) {
      toast.error(aiUsage.nextAvailableLabel || "Limite de análises atingido");
      return;
    }
    setAnalyzing(true);

    try {
      let imageUrl: string | null = null;
      if (imageFile && user) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("meal-images")
          .upload(path, imageFile);
        if (uploadError) throw uploadError;
        const { data: signedData } = await supabase.storage.from("meal-images").createSignedUrl(uploadData.path, 3600);
        imageUrl = signedData?.signedUrl || null;
      }

      const { data, error } = await supabase.functions.invoke("analyze-meal", {
        body: { description, image_url: imageUrl },
      });

      if (error) throw error;

      // Record AI usage
      await aiUsage.recordUsage();
      setResult({
        title: data.title || description.slice(0, 50),
        calories: data.calories || 0,
        protein: data.protein || 0,
        carbs: data.carbs || 0,
        fat: data.fat || 0,
        fiber: data.fiber || 0,
        score: data.score || 70,
        feedback: data.feedback || "Análise concluída.",
      });
    } catch (err: any) {
      toast.error("Erro na análise: " + (err.message || "Tente novamente"));
    }

    setAnalyzing(false);
  };

  const saveResult = async () => {
    if (!user || !result) return;
    setSaving(true);

    const xpEarned = 15 + Math.floor(result.score / 10); // bonus XP for AI analysis

    let imageUrl: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { data: uploadData } = await supabase.storage.from("meal-images").upload(path, imageFile);
      if (uploadData) {
        // Store the path, not a signed URL (signed URLs expire)
        imageUrl = uploadData.path;
      }
    }

    const { error } = await supabase.from("meals").insert({
      user_id: user.id,
      title: result.title,
      description,
      meal_type: mealType,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      fiber: result.fiber,
      ai_analyzed: true,
      ai_score: result.score,
      ai_feedback: result.feedback,
      image_url: imageUrl,
      xp_earned: xpEarned,
    });

    if (error) {
      toast.error("Erro ao salvar");
    } else {
      // Update stats
      const { data: stats } = await supabase
        .from("player_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (stats) {
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const newStreak = stats.last_meal_date === yesterday || stats.last_meal_date === today
          ? (stats.last_meal_date === today ? stats.current_streak : stats.current_streak + 1)
          : 1;
        const newXp = stats.total_xp + xpEarned;

        await supabase.from("player_stats").update({
          total_xp: newXp,
          level: Math.floor(newXp / 100) + 1,
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, stats.longest_streak),
          meals_logged: stats.meals_logged + 1,
          last_meal_date: today,
        }).eq("user_id", user.id);
      }

      toast.success("Refeição salva com sucesso! 🧠✨");
      setResult(null);
      setDescription("");
      setImageFile(null);
      setImagePreview(null);
    }
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                <Brain className="w-7 h-7 text-primary" /> Análise por IA
              </h1>
              <p className="text-muted-foreground text-sm">Descreva ou fotografe sua refeição</p>
            </div>
            <AIUsageBadge status={aiUsage} />
          </div>
        </div>

        {!result ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="glass rounded-xl p-6 shadow-card space-y-4">
              <div>
                <Label>Tipo de refeição</Label>
                <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mealTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Descreva sua refeição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Arroz integral, feijão preto, peito de frango grelhado, salada de alface e tomate com azeite..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Foto da refeição (opcional)</Label>
                <div className="mt-2">
                  {imagePreview ? (
                    <div className="relative rounded-lg overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                      <button
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 bg-background/80 rounded-full p-1 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Clique para enviar foto</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
              </div>

              <Button
                onClick={analyze}
                className="w-full gradient-primary shadow-glow gap-2"
                disabled={analyzing || !aiUsage.allowed}
                size="lg"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Analisando com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" /> Analisar Refeição
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="glass rounded-xl p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-lg">{result.title}</h2>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${
                  result.score >= 80 ? "bg-success/10 text-success ring-2 ring-success/30" :
                  result.score >= 60 ? "bg-warning/10 text-warning ring-2 ring-warning/30" :
                  "bg-destructive/10 text-destructive ring-2 ring-destructive/30"
                }`}>
                  {result.score}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-3 mb-4">
                {[
                  { label: "Kcal", value: result.calories },
                  { label: "Prot", value: `${result.protein}g` },
                  { label: "Carb", value: `${result.carbs}g` },
                  { label: "Gord", value: `${result.fat}g` },
                  { label: "Fibra", value: `${result.fiber}g` },
                ].map((m) => (
                  <div key={m.label} className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="font-bold">{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm text-primary">Feedback da IA</span>
                </div>
                <p className="text-sm text-muted-foreground">{result.feedback}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setResult(null)}
              >
                Analisar Outra
              </Button>
              <Button
                className="flex-1 gradient-primary shadow-glow"
                onClick={saveResult}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar Refeição"}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
