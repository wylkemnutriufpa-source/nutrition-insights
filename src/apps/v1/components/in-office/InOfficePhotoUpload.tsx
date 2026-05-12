import { useState, useRef, useEffect } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { Button } from "@v1/components/ui/button";
import { toast } from "sonner";
import { Camera, Upload, Trash2, Loader2, Eye, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@v1/components/ui/card";

interface Props {
  patientId: string;
  sessionId: string;
}

export default function InOfficePhotoUpload({ patientId, sessionId }: Props) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [photos, setPhotos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fileRefs = {
    front: useRef<HTMLInputElement>(null),
    side: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
  };

  const loadPhotos = async () => {
    const { data } = await supabase
      .from("body_assessment_photos")
      .select("*")
      .eq("patient_id", patientId)
      .order("assessment_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      // Get signed URLs
      const urls: any = {};
      for (const pos of ['front', 'side', 'back']) {
        const path = (data as any)[`${pos}_image_url`];
        if (path) {
          const { data: signed } = await supabase.storage
            .from("body-photos")
            .createSignedUrl(path, 3600);
          urls[pos] = signed?.signedUrl;
          urls[`${pos}_path`] = path;
        }
      }
      setPhotos({ ...data, ...urls });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPhotos();
  }, [patientId]);

  const handleUpload = async (pos: 'front' | 'side' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(pos);
    try {
      const ext = file.name.split(".").pop();
      const path = `${patientId}/${Date.now()}_${pos}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("body-photos")
        .upload(path, file);

      if (uploadError) throw uploadError;

      // Update DB record
      const updateData: any = {};
      updateData[`${pos}_image_url`] = path;

      if (photos?.id) {
        await supabase
          .from("body_assessment_photos")
          .update(updateData)
          .eq("id", photos.id);
      } else {
        await supabase
          .from("body_assessment_photos")
          .insert({
            patient_id: patientId,
            ...updateData,
            source: 'in_office'
          });
      }

      toast.success(`Foto ${pos === 'front' ? 'frontal' : pos === 'side' ? 'lateral' : 'traseira'} enviada!`);
      await loadPhotos();
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (pos: 'front' | 'side' | 'back') => {
    if (!photos?.[`${pos}_path` || `${pos}_image_url`]) return;
    const path = photos[`${pos}_path` || `${pos}_image_url`];
    
    setUploading(pos);
    try {
      await supabase.storage.from("body-photos").remove([path]);
      
      const updateData: any = {};
      updateData[`${pos}_image_url`] = null;
      
      await supabase
        .from("body_assessment_photos")
        .update(updateData)
        .eq("id", photos.id);

      toast.success("Foto removida");
      await loadPhotos();
    } catch (err: any) {
      toast.error("Erro ao remover: " + err.message);
    } finally {
      setUploading(null);
    }
  };

  if (loading) return null;

  const positions = [
    { key: 'front', label: 'Frente' },
    { key: 'side', label: 'Lado' },
    { key: 'back', label: 'Costas' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Camera className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium">Fotos da Avaliação</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {positions.map((pos) => (
          <div key={pos.key} className="space-y-2">
            <input
              ref={fileRefs[pos.key]}
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload(pos.key, e)}
              className="hidden"
            />
            
            <div 
              className={`aspect-[3/4] rounded-xl border-2 border-dashed border-border overflow-hidden relative group transition-all hover:border-primary/50
                ${photos?.[pos.key] ? "border-solid" : "bg-muted/30"}
              `}
            >
              {photos?.[pos.key] ? (
                <>
                  <img src={photos[pos.key]} alt={pos.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button variant="secondary" size="icon" onClick={() => window.open(photos[pos.key], '_blank')} className="h-8 w-8">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(pos.key)} className="h-8 w-8">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <button 
                  onClick={() => fileRefs[pos.key].current?.click()}
                  disabled={!!uploading}
                  className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                >
                  {uploading === pos.key ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                  <span className="text-[10px] uppercase font-bold tracking-wider">{pos.label}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
