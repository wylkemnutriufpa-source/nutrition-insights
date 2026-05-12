import { useState, useCallback } from "react";
import { Share2, Download, Camera } from "lucide-react";
import { Button } from "@v1/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@v1/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import html2canvas from "html2canvas";

interface ShareProgressButtonProps {
  captureRef: React.RefObject<HTMLElement>;
  context: "journey" | "ranking" | "achievements" | "checklist";
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
    if (!captureRef.current) {
      console.warn("ShareProgress: captureRef is null");
      return null;
    }
    try {
      const el = captureRef.current;
      const rect = el.getBoundingClientRect();

      // Calculate the visible portion of the element within the viewport
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      const visibleTop = Math.max(0, -rect.top);
      const visibleLeft = Math.max(0, -rect.left);
      const visibleWidth = Math.min(rect.width, viewportW - Math.max(0, rect.left)) - visibleLeft;
      const visibleHeight = Math.min(rect.height, viewportH - Math.max(0, rect.top)) - visibleTop;

      const dpr = Math.min(window.devicePixelRatio || 1, 3);

      const fullCanvas = await html2canvas(el, {
        backgroundColor: "#0a0a14",
        scale: dpr,
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: (doc) => {
          doc.querySelectorAll("img").forEach((img) => {
            if (img.naturalWidth === 0) img.style.display = "none";
          });
        },
      });

      // Crop to only the visible viewport area
      const cropX = visibleLeft * dpr;
      const cropY = visibleTop * dpr;
      const cropW = visibleWidth * dpr;
      const cropH = visibleHeight * dpr;

      const croppedCanvas = document.createElement("canvas");
      croppedCanvas.width = cropW;
      croppedCanvas.height = cropH;
      const ctx = croppedCanvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(fullCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      return new Promise((resolve) => {
        croppedCanvas.toBlob((b) => resolve(b), "image/png", 1.0);
      });
    } catch (err) {
      console.error("html2canvas error:", err);
      return null;
    }
  }, [captureRef]);

  const awardSharePoints = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.rpc("award_points", {
        _patient_id: user.id,
        _action_key: "social_share",
        _metadata: { context },
        _source_type: "social",
        _source_id: `share_${context}_${Date.now()}`,
      });
    } catch (e) {
      console.error("Error awarding share points:", e);
    }
  }, [user, context]);

  const handleShare = useCallback(async () => {
    setCapturing(true);
    try {
      const blob = await captureScreen();
      const label = CONTEXT_LABELS[context];
      const text = shareText || `${label.title} 🚀 ${label.hashtag} #FitJourney`;

      // Try Web Share API with file
      if (blob && navigator.share) {
        const file = new File([blob], "meu-progresso.png", { type: "image/png" });
        
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ text, files: [file] });
            await awardSharePoints();
            toast.success("Compartilhado com sucesso! 🎉");
            return;
          } catch (err: any) {
            if (err?.name === "AbortError") return;
            // Fall through to text-only share
          }
        }

        // Try text-only share
        try {
          await navigator.share({ text });
          await awardSharePoints();
          toast.success("Compartilhado com sucesso! 🎉");
          return;
        } catch (err: any) {
          if (err?.name === "AbortError") return;
        }
      }

      // Fallback: copy text to clipboard
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Texto copiado! Cole nas suas redes sociais 📋");
        await awardSharePoints();
      } catch {
        toast.info("Use o botão de download para salvar a imagem");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Share error:", err);
        toast.error("Erro ao compartilhar. Tente baixar a imagem.");
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
        toast.error("Não foi possível capturar a tela. Tente novamente.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fitjourney-${context}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      await awardSharePoints();
      toast.success("Imagem salva! Compartilhe nas suas redes 📸");
    } catch (err) {
      console.error("Download error:", err);
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
