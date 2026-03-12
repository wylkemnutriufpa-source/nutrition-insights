import { useState, useRef, useCallback } from "react";
import { Share2, Download, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import html2canvas from "html2canvas";

interface ShareProgressButtonProps {
  /** CSS selector or ref for the area to capture */
  captureRef: React.RefObject<HTMLElement>;
  /** Context label for the share text */
  context: "journey" | "ranking" | "achievements" | "checklist";
  /** Optional custom share text */
  shareText?: string;
  className?: string;
}

const CONTEXT_LABELS: Record<string, { title: string; hashtag: string }> = {
  journey: { title: "Minha Jornada de Saúde", hashtag: "#MinhaJornada" },
  ranking: { title: "Meu Ranking no FitJourney", hashtag: "#FitJourneyRanking" },
  achievements: { title: "Minhas Conquistas", hashtag: "#Conquistas" },
  checklist: { title: "Checklist do Dia Completo!", hashtag: "#ChecklistDoDia" },
};

export default function ShareProgressButton({
  captureRef,
  context,
  shareText,
  className,
}: ShareProgressButtonProps) {
  const { user } = useAuth();
  const [capturing, setCapturing] = useState(false);

  const captureScreen = useCallback(async (): Promise<Blob | null> => {
    if (!captureRef.current) return null;
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    } catch {
      return null;
    }
  }, [captureRef]);

  const awardSharePoints = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    // Check daily limit (max 2 shares per day)
    const { count } = await supabase
      .from("patient_points")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", user.id)
      .eq("action_key", "social_share")
      .eq("period_day", today);

    if ((count || 0) < 2) {
      await supabase.from("patient_points").insert({
        patient_id: user.id,
        action_key: "social_share",
        points: 10,
        period_day: today,
        period_week: `${new Date().getFullYear()}-W${String(Math.ceil((new Date().getDate()) / 7)).padStart(2, "0")}`,
        period_month: today.slice(0, 7),
        period_year: new Date().getFullYear(),
        metadata: { context },
      });
    }
  }, [user, context]);

  const handleShare = useCallback(async () => {
    setCapturing(true);
    try {
      const blob = await captureScreen();
      if (!blob) {
        toast.error("Não foi possível capturar a tela");
        return;
      }

      const label = CONTEXT_LABELS[context];
      const text = shareText || `${label.title} 🚀 ${label.hashtag} #FitJourney`;
      const file = new File([blob], "meu-progresso.png", { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ text, files: [file] });
        await awardSharePoints();
        toast.success("Compartilhado com sucesso! 🎉");
      } else {
        // Fallback: try share without file
        if (navigator.share) {
          await navigator.share({ text });
          await awardSharePoints();
          toast.success("Compartilhado com sucesso! 🎉");
        } else {
          toast.info("Use o botão de download para salvar a imagem");
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("Erro ao compartilhar");
      }
    } finally {
      setCapturing(false);
    }
  }, [captureScreen, context, shareText, awardSharePoints]);

  const handleDownload = useCallback(async () => {
    setCapturing(true);
    try {
      const blob = await captureScreen();
      if (!blob) {
        toast.error("Não foi possível capturar a tela");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fitjourney-${context}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      await awardSharePoints();
      toast.success("Imagem salva! Compartilhe nas suas redes 📸");
    } catch {
      toast.error("Erro ao salvar imagem");
    } finally {
      setCapturing(false);
    }
  }, [captureScreen, context, awardSharePoints]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          disabled={capturing}
        >
          {capturing ? (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
          <span className="ml-1.5 hidden sm:inline">Compartilhar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />
          Compartilhar nas redes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          Baixar imagem
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
