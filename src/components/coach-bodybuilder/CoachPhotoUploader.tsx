import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  athleteId: string;
  onUploaded: (position: "front" | "side" | "back", path: string) => void;
  frontPath?: string;
  sidePath?: string;
  backPath?: string;
}

const POSITIONS = [
  { key: "front" as const, label: "Frente" },
  { key: "side" as const, label: "Lado" },
  { key: "back" as const, label: "Costas" },
];

export default function CoachPhotoUploader({ athleteId, onUploaded, frontPath, sidePath, backPath }: Props) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const inputRefs = {
    front: useRef<HTMLInputElement>(null),
    side: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
  };

  const paths = { front: frontPath, side: sidePath, back: backPath };

  const handleFile = async (position: "front" | "side" | "back", file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são aceitas.");
      return;
    }

    // Preview
    const previewUrl = URL.createObjectURL(file);
    setPreviews(prev => ({ ...prev, [position]: previewUrl }));

    setUploading(position);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/${athleteId}/${Date.now()}_${position}.${ext}`;

      const { error } = await supabase.storage
        .from("coach-photos")
        .upload(filePath, file, { upsert: true });

      if (error) throw error;
      onUploaded(position, filePath);
      toast.success(`Foto ${position === "front" ? "frontal" : position === "side" ? "lateral" : "posterior"} enviada!`);
    } catch {
      toast.error("Erro ao enviar foto.");
      setPreviews(prev => { const n = { ...prev }; delete n[position]; return n; });
    } finally {
      setUploading(null);
    }
  };

  const clearPreview = (position: "front" | "side" | "back") => {
    setPreviews(prev => { const n = { ...prev }; delete n[position]; return n; });
    onUploaded(position, "");
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Camera className="h-4 w-4" /> Fotos do Check-in
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {POSITIONS.map(pos => {
          const preview = previews[pos.key];
          const existing = paths[pos.key];
          const isUploading = uploading === pos.key;

          return (
            <div key={pos.key} className="space-y-1.5">
              <Label className="text-xs text-center block">{pos.label}</Label>
              <input
                ref={inputRefs[pos.key]}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(pos.key, f);
                  e.target.value = "";
                }}
              />
              {preview || existing ? (
                <div className="relative group">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden border border-border bg-muted">
                    {preview ? (
                      <img src={preview} alt={pos.label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        Foto salva ✓
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => clearPreview(pos.key)}
                    className="absolute top-1 right-1 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => inputRefs[pos.key].current?.click()}
                  disabled={isUploading}
                  className="aspect-[3/4] w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span className="text-[10px]">Upload</span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
