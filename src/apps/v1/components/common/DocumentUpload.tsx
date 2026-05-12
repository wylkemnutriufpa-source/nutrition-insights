import { useState, useRef } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { Button } from "@v1/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Loader2, Download, File } from "lucide-react";

interface UploadedDoc {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface DocumentUploadProps {
  patientId: string;
  nutritionistId: string;
  documentType: "meal_plan" | "assessment";
  referenceId?: string; // meal_plan_id or assessment_id
  documents: UploadedDoc[];
  onUploadComplete: () => void;
}

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg";
const MAX_SIZE_MB = 10;

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(mime: string | null) {
  if (mime?.includes("pdf")) return "📄";
  if (mime?.includes("sheet") || mime?.includes("excel") || mime?.includes("xls")) return "📊";
  if (mime?.includes("word") || mime?.includes("doc")) return "📝";
  if (mime?.includes("image")) return "🖼️";
  return "📎";
}

export default function DocumentUpload({
  patientId,
  nutritionistId,
  documentType,
  referenceId,
  documents,
  onUploadComplete,
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo: ${MAX_SIZE_MB}MB`);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${patientId}/${documentType}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("patient-documents")
        .upload(path, file);

      if (uploadError) throw uploadError;

      // Bucket is private — store the path only, use signed URLs for access
      const { error: dbError } = await supabase.from("patient_documents" as any).insert({
        patient_id: patientId,
        nutritionist_id: nutritionistId,
        document_type: documentType,
        title: file.name.replace(/\.[^.]+$/, ""),
        file_url: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        ...(documentType === "meal_plan" && referenceId ? { meal_plan_id: referenceId } : {}),
        ...(documentType === "assessment" && referenceId ? { assessment_id: referenceId } : {}),
      });

      if (dbError) throw dbError;

      toast.success("Documento enviado com sucesso! 📎");
      onUploadComplete();
    } catch (err: any) {
      toast.error("Erro ao enviar: " + (err.message || "Tente novamente"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (doc: UploadedDoc) => {
    setDeleting(doc.id);
    try {
      await supabase.storage.from("patient-documents").remove([doc.file_url]);
      await supabase.from("patient_documents" as any).delete().eq("id", doc.id);
      toast.success("Documento removido");
      onUploadComplete();
    } catch (err: any) {
      toast.error("Erro ao remover: " + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (doc: UploadedDoc) => {
    try {
      const { data, error } = await supabase.storage
        .from("patient-documents")
        .createSignedUrl(doc.file_url, 60);

      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      toast.error("Erro ao baixar: " + err.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {uploading ? "Enviando..." : "Upload Documento"}
        </Button>
        <span className="text-xs text-muted-foreground">
          PDF, DOC, Excel, Imagens (máx. {MAX_SIZE_MB}MB)
        </span>
      </div>

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group"
            >
              <span className="text-lg">{getFileIcon(doc.mime_type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(doc)}
                  disabled={deleting === doc.id}
                >
                  {deleting === doc.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
