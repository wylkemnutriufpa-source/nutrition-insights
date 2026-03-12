import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Camera, Download, Share2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface BeforeAfterData {
  initialWeight: number | null;
  currentWeight: number | null;
  initialDate: string | null;
  latestDate: string | null;
  totalDays: number;
  streak: number;
  level: number;
  totalXp: number;
  checklistAdherence: number;
  userName: string;
}

export default function BeforeAfterReport() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<BeforeAfterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const generate = async () => {
    if (!user) return;
    setLoading(true);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 30);

    const [checkinsRes, statsRes, checklistRes] = await Promise.all([
      supabase
        .from("patient_checkins")
        .select("weight, created_at")
        .eq("patient_id", user.id)
        .not("weight", "is", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("player_stats")
        .select("current_streak, level, total_xp")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("checklist_tasks")
        .select("completed")
        .eq("patient_id", user.id)
        .gte("date", weekAgo.toISOString().split("T")[0]),
    ]);

    const checkins = checkinsRes.data || [];
    const stats = statsRes.data;
    const tasks = checklistRes.data || [];
    const adherence = tasks.length > 0
      ? Math.round((tasks.filter((t: any) => t.completed).length / tasks.length) * 100)
      : 0;

    setData({
      initialWeight: checkins[0]?.weight || null,
      currentWeight: checkins[checkins.length - 1]?.weight || null,
      initialDate: checkins[0]?.created_at || null,
      latestDate: checkins[checkins.length - 1]?.created_at || null,
      totalDays: checkins.length > 1
        ? Math.ceil((new Date(checkins[checkins.length - 1].created_at).getTime() - new Date(checkins[0].created_at).getTime()) / 86400000)
        : 0,
      streak: stats?.current_streak || 0,
      level: stats?.level || 1,
      totalXp: stats?.total_xp || 0,
      checklistAdherence: adherence,
      userName: profile?.full_name || "Paciente",
    });

    setGenerated(true);
    setLoading(false);
  };

  const exportImage = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#0d0d1a",
        useCORS: true,
      });
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png")
      );

      if (navigator.share && navigator.canShare?.({ files: [new File([blob], "evolucao.png", { type: "image/png" })] })) {
        await navigator.share({
          text: `Minha evolução no FitJourney! 💪🔥`,
          files: [new File([blob], "evolucao.png", { type: "image/png" })],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "fitjourney-evolucao.png";
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success("Imagem gerada! 📸");
    } catch {
      toast.error("Erro ao exportar imagem");
    }
  };

  const weightChange = data?.initialWeight && data?.currentWeight
    ? data.currentWeight - data.initialWeight
    : null;

  if (!generated) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <Camera className="w-12 h-12 text-primary mx-auto mb-3" />
        <h3 className="font-display font-bold text-lg mb-1">Relatório de Evolução</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Gere um card visual da sua evolução para compartilhar nas redes sociais
        </p>
        <Button onClick={generate} disabled={loading} className="gradient-primary shadow-glow gap-2">
          {loading ? "Gerando..." : "Gerar Relatório"} <Camera className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Instagram-friendly card (1080x1080 ratio) */}
      <div
        ref={reportRef}
        className="relative overflow-hidden rounded-2xl mx-auto"
        style={{ maxWidth: 400, aspectRatio: "1/1" }}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d1a] via-[#1a1a2e] to-[#0d0d1a]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.1),transparent_50%)]" />

        <div className="relative z-10 p-6 h-full flex flex-col justify-between">
          {/* Header */}
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary/70 mb-1">Minha Evolução</p>
            <h2 className="font-display text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              FitJourney
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{data?.userName}</p>
          </div>

          {/* Weight Change - Hero */}
          <div className="text-center py-4">
            {weightChange !== null ? (
              <>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground uppercase">Antes</p>
                    <p className="font-display text-2xl font-bold">{data?.initialWeight}kg</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    {weightChange < 0 ? (
                      <TrendingDown className="w-5 h-5 text-success" />
                    ) : weightChange > 0 ? (
                      <TrendingUp className="w-5 h-5 text-destructive" />
                    ) : (
                      <Minus className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground uppercase">Agora</p>
                    <p className="font-display text-2xl font-bold">{data?.currentWeight}kg</p>
                  </div>
                </div>
                <p className={`text-lg font-bold ${weightChange < 0 ? "text-success" : weightChange > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)}kg em {data?.totalDays} dias
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Registre check-ins para ver sua evolução</p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
              <p className="text-[9px] text-muted-foreground uppercase">Streak</p>
              <p className="font-display font-bold text-lg text-primary">{data?.streak}🔥</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
              <p className="text-[9px] text-muted-foreground uppercase">Level</p>
              <p className="font-display font-bold text-lg text-accent">{data?.level} ⭐</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
              <p className="text-[9px] text-muted-foreground uppercase">XP Total</p>
              <p className="font-display font-bold text-lg">{data?.totalXp}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
              <p className="text-[9px] text-muted-foreground uppercase">Adesão</p>
              <p className="font-display font-bold text-lg text-success">{data?.checklistAdherence}%</p>
            </div>
          </div>

          {/* Footer watermark */}
          <p className="text-center text-[8px] text-muted-foreground/50 mt-2">
            fitjourney.app • Nutrição Inteligente
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-center">
        <Button onClick={exportImage} className="gradient-primary shadow-glow gap-2">
          <Share2 className="w-4 h-4" /> Compartilhar
        </Button>
        <Button variant="outline" onClick={generate} className="gap-2">
          🔄 Atualizar
        </Button>
      </div>
    </div>
  );
}
