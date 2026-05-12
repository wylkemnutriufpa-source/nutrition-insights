import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MessageCircle, Trophy, AlertTriangle, Megaphone, Sparkles, User, Activity, Maximize2, Clock, Eye, Pencil, Trash2, MoreVertical, Loader2, Check, X as XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import TimelineReactions from "./TimelineReactions";
import TimelineComments from "./TimelineComments";
import TimelinePoll from "./TimelinePoll";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; accent: string; label: string; glow?: string; leftAccent: string }> = {
  professional_post: { icon: Megaphone, accent: "border-border/60 bg-card", label: "Profissional", leftAccent: "bg-emerald-500" },
  patient_post: { icon: User, accent: "border-border/60 bg-card", label: "Paciente", leftAccent: "bg-sky-500" },
  clinical_alert: { icon: AlertTriangle, accent: "border-red-500/20 bg-red-500/[0.03]", label: "Alerta Clínico", leftAccent: "bg-red-500" },
  achievement: { icon: Trophy, accent: "border-amber-500/20 bg-amber-500/[0.03]", label: "Conquista", glow: "shadow-[0_0_20px_-5px_hsl(45_100%_50%/0.15)]", leftAccent: "bg-amber-500" },
  system_event: { icon: Activity, accent: "border-border/40 bg-muted/30", label: "Sistema", leftAccent: "bg-muted-foreground/50" },
  poll: { icon: Sparkles, accent: "border-violet-500/20 bg-violet-500/[0.03]", label: "Enquete", leftAccent: "bg-violet-500" },
};

interface Props {
  event: any;
  index: number;
}

export default function TimelineEventCard({ event, index }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(event.title || "");
  const [editDesc, setEditDesc] = useState(event.description || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const config = TYPE_CONFIG[event.event_type] || TYPE_CONFIG.system_event;
  const Icon = config.icon;
  const hasPoll = event.poll_question && Array.isArray(event.poll_options) && event.poll_options.length > 0;
  const isAuthor = user?.id === event.author_id;

  const DESC_TRUNCATE = 200;
  const longDesc = event.description && event.description.length > DESC_TRUNCATE;
  const displayDesc = longDesc ? event.description.slice(0, DESC_TRUNCATE) + "…" : event.description;

  const formattedDate = (() => {
    try {
      return format(new Date(event.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "";
    }
  })();

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("timeline_events")
        .update({ title: editTitle.trim(), description: editDesc.trim() || null } as any)
        .eq("id", event.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["timeline-events"] });
      toast.success("Publicação atualizada!");
      setEditing(false);
      setModalOpen(false);
    } catch {
      toast.error("Erro ao salvar");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("timeline_events")
        .delete()
        .eq("id", event.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["timeline-events"] });
      toast.success("Publicação excluída");
      setModalOpen(false);
    } catch {
      toast.error("Erro ao excluir");
    }
    setDeleting(false);
    setConfirmDelete(false);
  };

  const startEdit = () => {
    setEditTitle(event.title || "");
    setEditDesc(event.description || "");
    setEditing(true);
    setModalOpen(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditTitle(event.title || "");
    setEditDesc(event.description || "");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3, ease: "easeOut" }}
        whileHover={{ y: -1, boxShadow: "0 4px 20px -4px rgba(0,0,0,0.08)" }}
        className={cn(
          "relative rounded-2xl border p-0 transition-all overflow-hidden group cursor-default",
          config.accent,
          config.glow
        )}
      >
        <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl", config.leftAccent)} />

        <div className="pl-5 pr-4 py-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-2">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105",
              event.event_type === "achievement" ? "bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30" :
              event.event_type === "clinical_alert" ? "bg-red-500/10 border border-red-500/20" :
              "bg-muted/80 border border-border/50"
            )}>
              <Icon className={cn(
                "h-4 w-4",
                event.event_type === "achievement" ? "text-amber-500" :
                event.event_type === "clinical_alert" ? "text-red-500" :
                "text-foreground/60"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-foreground leading-tight">{event.title}</h4>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium border-border/50">{config.label}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {event.is_pinned && (
                <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">📌 Fixado</Badge>
              )}
              {/* Author actions menu */}
              {isAuthor && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[140px]">
                    <DropdownMenuItem onClick={startEdit} className="gap-2 text-xs">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setConfirmDelete(true); setModalOpen(true); }} className="gap-2 text-xs text-destructive focus:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {/* Expand button */}
              <button
                onClick={() => setModalOpen(true)}
                className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                aria-label="Expandir publicação"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="ml-12 mb-3">
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
                {displayDesc}
              </p>
              {longDesc && (
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1.5 font-medium transition-colors"
                >
                  <Eye className="h-3 w-3" /> Ler tudo
                </button>
              )}
            </div>
          )}

          {/* Media */}
          {event.media_url && (
            <div className="ml-12 mb-3">
              <motion.img
                src={event.media_url}
                alt=""
                className="rounded-xl max-h-48 object-cover w-full border border-border/50 cursor-pointer hover:opacity-90 transition-opacity"
                loading="lazy"
                onClick={() => setLightboxOpen(true)}
                whileHover={{ scale: 1.01 }}
              />
              <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent className="max-w-3xl p-2 bg-black/95 border-none">
                  <img src={event.media_url} alt="" className="w-full h-auto rounded-lg" />
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Poll */}
          {hasPoll && (
            <div className="ml-12">
              <TimelinePoll eventId={event.id} question={event.poll_question} options={event.poll_options} />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 ml-12">
            <TimelineReactions eventId={event.id} />
            <button
              onClick={() => setShowComments(!showComments)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium transition-colors rounded-lg px-2.5 py-1.5",
                showComments ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Comentar
            </button>
          </div>

          {showComments && (
            <div className="ml-12 mt-2">
              <TimelineComments eventId={event.id} />
            </div>
          )}
        </div>
      </motion.div>

      {/* ===== FULL POST / EDIT MODAL ===== */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) { cancelEdit(); setConfirmDelete(false); } setModalOpen(open); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0 border-border/60">
          {/* Delete confirmation */}
          <AnimatePresence>
            {confirmDelete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 rounded-2xl"
              >
                <Trash2 className="h-10 w-10 text-destructive/60" />
                <p className="text-sm font-semibold text-foreground">Excluir esta publicação?</p>
                <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-5 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-all"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, excluir"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-5 py-2 rounded-xl bg-muted text-sm font-medium hover:bg-muted/80 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal Header */}
          <div className="flex items-center gap-3 p-5 pb-4 border-b border-border/40 sticky top-0 bg-card z-10">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              event.event_type === "achievement" ? "bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30" :
              event.event_type === "clinical_alert" ? "bg-red-500/10 border border-red-500/20" :
              "bg-muted/80 border border-border/50"
            )}>
              <Icon className={cn(
                "h-5 w-5",
                event.event_type === "achievement" ? "text-amber-500" :
                event.event_type === "clinical_alert" ? "text-red-500" :
                "text-foreground/60"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-semibold text-primary">Editando publicação</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground">{event.title}</h3>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium">{config.label}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formattedDate}
                  </div>
                </>
              )}
            </div>
            {isAuthor && !editing && (
              <div className="flex gap-1">
                <button onClick={startEdit} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setConfirmDelete(true)} className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors" title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-5 space-y-4">
            {editing ? (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Título</label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value.slice(0, 100))}
                    className="w-full bg-muted/50 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none border border-border focus:border-primary/50 transition-colors"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Descrição</label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value.slice(0, 2000))}
                    rows={6}
                    className="w-full bg-muted/50 rounded-xl px-4 py-2.5 text-sm outline-none border border-border focus:border-primary/50 resize-none leading-relaxed transition-colors"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 text-right">{editDesc.length}/2000</p>
                </div>
              </>
            ) : (
              <>
                {event.description && (
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                    {event.description}
                  </p>
                )}
                {event.media_url && (
                  <img src={event.media_url} alt="" className="rounded-xl w-full object-contain max-h-[500px] border border-border/50" />
                )}
                {hasPoll && (
                  <TimelinePoll eventId={event.id} question={event.poll_question} options={event.poll_options} />
                )}
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="border-t border-border/40 p-5 space-y-4">
            {editing ? (
              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <XIcon className="h-3.5 w-3.5" /> Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editTitle.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-all shadow-sm"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Salvar
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <TimelineReactions eventId={event.id} />
                  <button
                    onClick={() => setShowComments(!showComments)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium transition-colors rounded-lg px-2.5 py-1.5",
                      showComments ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Comentários
                  </button>
                </div>
                {showComments && <TimelineComments eventId={event.id} />}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
