import { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MessageCircle, Trophy, AlertTriangle, Megaphone, Sparkles, User, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import TimelineReactions from "./TimelineReactions";
import TimelineComments from "./TimelineComments";
import TimelinePoll from "./TimelinePoll";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  const [showComments, setShowComments] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const config = TYPE_CONFIG[event.event_type] || TYPE_CONFIG.system_event;
  const Icon = config.icon;
  const hasPoll = event.poll_question && Array.isArray(event.poll_options) && event.poll_options.length > 0;

  // Show full text by default for short posts, truncate only very long ones
  const DESC_TRUNCATE = 300;
  const longDesc = event.description && event.description.length > DESC_TRUNCATE;
  const displayDesc = longDesc && !descExpanded ? event.description.slice(0, DESC_TRUNCATE) + "…" : event.description;

  return (
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
      {/* Left accent stripe */}
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
          {event.is_pinned && (
            <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 shrink-0">📌 Fixado</Badge>
          )}
        </div>

        {/* Description — always fully visible, expand only for very long */}
        {event.description && (
          <div className="ml-12 mb-3">
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
              {displayDesc}
            </p>
            {longDesc && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1.5 font-medium transition-colors"
              >
                {descExpanded ? (
                  <><ChevronUp className="h-3 w-3" /> Ver menos</>
                ) : (
                  <><ChevronDown className="h-3 w-3" /> Ver mais</>
                )}
              </button>
            )}
          </div>
        )}

        {/* Media with lightbox */}
        {event.media_url && (
          <div className="ml-12 mb-3">
            <motion.img
              src={event.media_url}
              alt=""
              className="rounded-xl max-h-64 object-cover w-full border border-border/50 cursor-pointer hover:opacity-90 transition-opacity"
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
            <TimelinePoll
              eventId={event.id}
              question={event.poll_question}
              options={event.poll_options}
            />
          </div>
        )}

        {/* Footer: Reactions + Comments toggle */}
        <div className="flex items-center justify-between mt-3 ml-12">
          <TimelineReactions eventId={event.id} />
          <button
            onClick={() => setShowComments(!showComments)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium transition-colors rounded-lg px-2.5 py-1.5",
              showComments
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Comentar
          </button>
        </div>

        {/* Comments section — no AnimatePresence wrapping issue */}
        {showComments && (
          <div className="ml-12 mt-2">
            <TimelineComments eventId={event.id} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
