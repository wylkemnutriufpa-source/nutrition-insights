import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Upload, Search, Play, Trash2, GripVertical, Plus,
  Film, Filter, X, Loader2, Clock, Tag, Edit2, Check
} from "lucide-react";

const MUSCLE_GROUPS = [
  "Todos", "Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Pernas",
  "Quadríceps", "Posterior", "Glúteos", "Core", "Panturrilha", "Cardio", "Outro"
];

interface ExerciseVideo {
  id: string;
  title: string;
  muscle_group: string;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  description: string | null;
  tags: string[];
  is_public: boolean;
  created_at: string;
  _source?: "personal" | "system";
}

interface Props {
  draggable?: boolean;
  onDragStart?: (video: ExerciseVideo) => void;
  onSelect?: (video: ExerciseVideo) => void;
}

export default function ExerciseVideoLibrary({ draggable = false, onDragStart, onSelect }: Props) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState("Todos");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<ExerciseVideo | null>(null);
  const [editingVideo, setEditingVideo] = useState<ExerciseVideo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadGroup, setUploadGroup] = useState("Outro");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDuration, setUploadDuration] = useState<number | null>(null);

  const loadVideos = async () => {
    if (!user) return;
    
    // Load user's personal videos
    const { data: personalData } = await supabase
      .from("exercise_video_library")
      .select("*")
      .order("created_at", { ascending: false });

    // Load system videos from exercises_library that have video_url
    const { data: systemData } = await supabase
      .from("exercises_library")
      .select("id, name, muscle_group, video_url, thumbnail_url, tags, description, created_at")
      .not("video_url", "is", null);

    const personal: ExerciseVideo[] = (personalData || []).map((v: any) => ({
      ...v,
      _source: "personal" as const,
    }));

    const system: ExerciseVideo[] = (systemData || []).map((v: any) => ({
      id: v.id,
      title: v.name,
      muscle_group: v.muscle_group || "Outro",
      video_url: v.video_url,
      thumbnail_url: v.thumbnail_url,
      duration_seconds: null,
      description: v.description,
      tags: v.tags || [],
      is_public: true,
      created_at: v.created_at,
      _source: "system" as const,
    }));

    setVideos([...personal, ...system]);
    setLoading(false);
  };

  useEffect(() => { loadVideos(); }, [user]);

  const filteredVideos = videos.filter(v => {
    const matchSearch = !searchTerm ||
      v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchGroup = filterGroup === "Todos" || v.muscle_group === filterGroup;
    return matchSearch && matchGroup;
  });

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from("exercise-videos")
      .createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  };

  const handleUpload = async () => {
    if (!user || !uploadFile || !uploadTitle.trim()) {
      toast.error("Preencha título e selecione um vídeo");
      return;
    }

    setUploading(true);
    try {
      const ext = uploadFile.name.split(".").pop() || "mp4";
      const fileName = `${user.id}/${Date.now()}-${uploadTitle.replace(/\s+/g, "-").toLowerCase()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("exercise-videos")
        .upload(fileName, uploadFile, { contentType: uploadFile.type });

      if (uploadError) throw uploadError;

      const tags = uploadTags.split(",").map(t => t.trim()).filter(Boolean);

      const { error: insertError } = await supabase
        .from("exercise_video_library")
        .insert({
          user_id: user.id,
          title: uploadTitle,
          muscle_group: uploadGroup,
          video_url: fileName,
          description: uploadDescription || null,
          tags,
          is_public: false,
          duration_seconds: uploadDuration,
        });

      if (insertError) throw insertError;

      toast.success("Vídeo adicionado à biblioteca! 🎬");
      resetUploadForm();
      setUploadDialogOpen(false);
      loadVideos();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao fazer upload");
    }
    setUploading(false);
  };

  const handleDelete = async (video: ExerciseVideo) => {
    if (!confirm("Excluir este vídeo da biblioteca?")) return;

    await supabase.storage.from("exercise-videos").remove([video.video_url]);
    await supabase.from("exercise_video_library").delete().eq("id", video.id);
    toast.success("Vídeo removido");
    loadVideos();
  };

  const handleUpdate = async () => {
    if (!editingVideo) return;
    const { error } = await supabase
      .from("exercise_video_library")
      .update({
        title: editingVideo.title,
        muscle_group: editingVideo.muscle_group,
        description: editingVideo.description,
        tags: editingVideo.tags,
      })
      .eq("id", editingVideo.id);

    if (!error) {
      toast.success("Vídeo atualizado");
      setEditingVideo(null);
      loadVideos();
    }
  };

  const resetUploadForm = () => {
    setUploadTitle("");
    setUploadGroup("Outro");
    setUploadDescription("");
    setUploadTags("");
    setUploadFile(null);
    setUploadDuration(null);
  };

  const handleDragStart = (e: React.DragEvent, video: ExerciseVideo) => {
    e.dataTransfer.setData("application/exercise-video", JSON.stringify(video));
    e.dataTransfer.effectAllowed = "copy";
    onDragStart?.(video);
  };

  const VideoCard = ({ video }: { video: ExerciseVideo }) => {
    const [signedUrl, setSignedUrl] = useState<string>("");
    const [loadingUrl, setLoadingUrl] = useState(false);

    const loadUrl = async () => {
      if (signedUrl) return;
      setLoadingUrl(true);
      const url = await getSignedUrl(video.video_url);
      setSignedUrl(url);
      setLoadingUrl(false);
    };

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        draggable={draggable}
        onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, video)}
        className={`group relative overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-md ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        {/* Video Preview Area */}
        <div
          className="relative aspect-video bg-muted/50 flex items-center justify-center cursor-pointer overflow-hidden"
          onClick={() => { loadUrl(); setPreviewVideo(video); }}
        >
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
              <Film className="w-8 h-8 opacity-40" />
              <span className="text-[10px]">Clique para ver</span>
            </div>
          )}

          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100">
              <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
            </div>
          </div>

          {/* Drag handle */}
          {draggable && (
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/60 rounded-md p-1">
                <GripVertical className="w-4 h-4 text-white" />
              </div>
            </div>
          )}

          {/* Duration badge */}
          {video.duration_seconds && (
            <div className="absolute bottom-2 right-2">
              <Badge className="bg-black/70 text-white text-[10px] border-none gap-1">
                <Clock className="w-3 h-3" />
                {video.duration_seconds}s
              </Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold truncate">{video.title}</h4>
              <div className="flex items-center gap-1 mt-1">
                <Badge variant="outline" className="text-[10px]">{video.muscle_group}</Badge>
                {video._source === "system" && (
                  <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">Sistema</Badge>
                )}
              </div>
            </div>
            {video._source !== "system" && (
              <div className="flex gap-0.5 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingVideo(video)}>
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(video)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            )}
          </div>

          {/* Select button when in picker mode */}
          {onSelect && (
            <Button size="sm" className="w-full mt-2 gap-1" onClick={() => onSelect(video)}>
              <Check className="w-3 h-3" /> Selecionar
            </Button>
          )}

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {video.tags.slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {video.tags.length > 3 && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">+{video.tags.length - 3}</Badge>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Biblioteca de Vídeos</h2>
          <Badge variant="secondary" className="text-xs">{videos.length} vídeos</Badge>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)} className="gap-1.5">
          <Upload className="w-4 h-4" /> Adicionar Vídeo
        </Button>
      </div>

      {draggable && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <GripVertical className="w-4 h-4 text-primary" />
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Arraste e solte</strong> os vídeos diretamente nos exercícios do plano de treino do aluno
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-[140px] h-9">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MUSCLE_GROUPS.map(g => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Video Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Film className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-lg">Nenhum vídeo encontrado</p>
          <p className="text-sm mt-1">Adicione vídeos curtos de demonstração dos exercícios</p>
          <Button onClick={() => setUploadDialogOpen(true)} className="mt-4 gap-1.5">
            <Plus className="w-4 h-4" /> Primeiro Vídeo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredVideos.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Adicionar Vídeo de Exercício
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Vídeo *</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
              >
                {uploadFile ? (
                  <div className="flex items-center gap-2 justify-center">
                    <Film className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{uploadFile.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="w-8 h-8 opacity-40" />
                    <p className="text-sm">Clique para selecionar</p>
                    <p className="text-[10px]">MP4, MOV, WebM • Máx 20MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setUploadFile(file);
                  if (file && !uploadTitle.trim()) {
                    // Auto-name from filename: "supino-reto-barra.mp4" → "Supino reto barra"
                    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                    const humanName = nameWithoutExt
                      .replace(/[-_]+/g, " ")
                      .replace(/\b\w/g, c => c.toUpperCase())
                      .trim();
                    setUploadTitle(humanName);
                  }
                  // Auto-detect duration
                  if (file) {
                    const video = document.createElement("video");
                    video.preload = "metadata";
                    video.onloadedmetadata = () => {
                      setUploadDuration(Math.round(video.duration));
                      URL.revokeObjectURL(video.src);
                    };
                    video.src = URL.createObjectURL(file);
                  }
                }}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome do exercício *</label>
              <Input
                placeholder="Ex: Supino reto com barra"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
              />
              {uploadTitle && (
                <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {uploadDuration ? `Detectado: ${uploadDuration}s de duração` : "Nome preenchido automaticamente"}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Grupo muscular</label>
              <Select value={uploadGroup} onValueChange={setUploadGroup}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.filter(g => g !== "Todos").map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição (opcional)</label>
              <Textarea
                placeholder="Dicas de execução, variações..."
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                className="h-16 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (separadas por vírgula)</label>
              <Input
                placeholder="Ex: peito, push, intermediário"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { resetUploadForm(); setUploadDialogOpen(false); }}>
                Cancelar
              </Button>
              <Button className="flex-1 gap-1.5" onClick={handleUpload} disabled={uploading || !uploadFile || !uploadTitle.trim()}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Enviando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewVideo?.title}</DialogTitle>
          </DialogHeader>
          {previewVideo && (
            <div className="space-y-3">
              <VideoPlayer videoPath={previewVideo.video_url} />
              <div className="flex items-center gap-2 flex-wrap">
                <Badge>{previewVideo.muscle_group}</Badge>
                {previewVideo.tags?.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
              {previewVideo.description && (
                <p className="text-sm text-muted-foreground">{previewVideo.description}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingVideo} onOpenChange={() => setEditingVideo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-4 h-4" /> Editar Vídeo
            </DialogTitle>
          </DialogHeader>
          {editingVideo && (
            <div className="space-y-4">
              <Input
                value={editingVideo.title}
                onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                placeholder="Nome do exercício"
              />
              <Select
                value={editingVideo.muscle_group}
                onValueChange={(v) => setEditingVideo({ ...editingVideo, muscle_group: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.filter(g => g !== "Todos").map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={editingVideo.description || ""}
                onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                placeholder="Descrição"
                className="h-16 resize-none"
              />
              <Input
                value={editingVideo.tags?.join(", ") || ""}
                onChange={(e) => setEditingVideo({ ...editingVideo, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                placeholder="Tags (separadas por vírgula)"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingVideo(null)}>Cancelar</Button>
                <Button className="flex-1 gap-1" onClick={handleUpdate}>
                  <Check className="w-4 h-4" /> Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VideoPlayer({ videoPath }: { videoPath: string }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isDirectUrl = videoPath.startsWith("http");

  useEffect(() => {
    setError(false);
    if (isDirectUrl) {
      setUrl(videoPath);
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data } = await supabase.storage
        .from("exercise-videos")
        .createSignedUrl(videoPath, 3600);
      if (data?.signedUrl) {
        setUrl(data.signedUrl);
      } else {
        setError(true);
      }
      setLoading(false);
    };
    load();
  }, [videoPath, isDirectUrl]);

  if (loading) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // YouTube embed
  const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
  if (isYoutube) {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&?\s]+)/);
    const embedUrl = match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : url;
    return (
      <iframe src={embedUrl} className="w-full rounded-lg aspect-video" allowFullScreen allow="autoplay; encrypted-media" title="Exercise video" />
    );
  }

  if (error || !url) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground gap-2">
        <Film className="w-8 h-8 opacity-40" />
        <p className="text-sm">Vídeo não disponível</p>
        <p className="text-xs opacity-60">O arquivo pode ter sido removido ou não foi carregado</p>
      </div>
    );
  }

  return (
    <video
      src={url}
      controls
      className="w-full rounded-lg aspect-video bg-black"
      onError={() => setError(true)}
    />
  );
}
