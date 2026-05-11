import { useState, useRef } from "react";
import { Camera, Loader2, X, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MealPhotoUploadProps {
  imageUrl?: string | null;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
  className?: string;
  compact?: boolean;
  label?: string;
}

export function MealPhotoUpload({ imageUrl, onUploaded, onRemoved, className, compact, label }: MealPhotoUploadProps) {

export function MealPhotoUpload({ imageUrl, onUploaded, onRemoved, className, compact }: MealPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("meal-photos")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("meal-photos")
        .getPublicUrl(path);

      onUploaded(urlData.publicUrl);
      toast.success("Foto adicionada!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Erro ao enviar foto: " + (err?.message || "Tente novamente"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (imageUrl) {
    return (
      <div className={cn("relative group rounded-xl overflow-hidden", className)}>
        <img
          src={imageUrl}
          alt="Foto da refeição"
          className={cn(
            "w-full object-cover rounded-xl",
            compact ? "h-20" : "h-40"
          )}
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemoved(); }}
          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
          title="Remover foto"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          className="absolute bottom-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
          title="Trocar foto"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        disabled={uploading}
        className={cn(
          "w-full border-2 border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer",
          compact ? "py-2 px-3" : "py-6 px-4"
        )}
      >
        {uploading ? (
          <Loader2 className={cn("animate-spin", compact ? "w-4 h-4" : "w-6 h-6")} />
        ) : (
          <>
            <ImagePlus className={cn(compact ? "w-4 h-4" : "w-6 h-6")} />
            <span className={cn("font-medium", compact ? "text-[9px]" : "text-xs")}>
              {label || (compact ? "Foto" : "Adicionar foto inspiracional")}
            </span>
          </>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}
