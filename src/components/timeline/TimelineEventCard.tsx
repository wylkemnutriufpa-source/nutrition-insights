import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MessageCircle, Trophy, AlertTriangle, Megaphone, Sparkles, User, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import TimelineReactions from "./TimelineReactions";
import TimelineComments from "./TimelineComments";
import TimelinePoll from "./TimelinePoll";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; accent: string; label: string; glow?: string }> = {
  professional_post: { icon: Megaphone, accent: "border-primary/30 bg-primary/5", label: "Profissional" },
  patient_post: { icon: User, accent: "border-blue-500/30 bg-blue-500/5", label: "Paciente" },
  clinical_alert: { icon: AlertTriangle, accent: "border-red-500/30 bg-red-500/5", label: "Alerta Clínico" },
  achievement: { icon: Trophy, accent: "border-amber-500/30 bg-amber-500/5", label: "Conquista", glow: "shadow-[0_0_15px_-3px_hsl(var(--chart-4)/0.3)]" },
  system_event: { icon: Activity, accent: "border-muted-foreground/20 bg-muted/50", label: "Sistema" },
  poll: { icon: Sparkles, accent: "border-violet-500/30 bg-violet-500/5", label: "Enquete" },
};

interface Props {
  event: any;
  index: number;
}

export default function TimelineEventCard({ event, index }: Props) {
  const [showComments, setShowComments] = useState(false);
  const config = TYPE_CONFIG[event.event_type] || TYPE_CONFIG.system_event;
  const Icon = config.icon;
  const hasPoll = event.poll_question && Array.isArray(event.poll_options) && event.poll_options.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={cn(
        "relative rounded-xl border p-4 transition-all hover:shadow-md",
        config.accent,
        config.glow
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        <div className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-foreground/70" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-foreground leading-tight">{event.title}</h4>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">{config.label}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        {event.is_pinned && (
          <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">📌 Fixado</Badge>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <p className="text-sm text-foreground/80 leading-relaxed mb-3 pl-12">{event.description}</p>
      )}

      {/* Media */}
      {event.media_url && (
        <div className="pl-12 mb-3">
          <img
            src={event.media_url}
            alt=""
            className="rounded-lg max-h-64 object-cover w-full border border-border"
            loading="lazy"
          />
        </div>
      )}

      {/* Poll */}
      {hasPoll && (
        <div className="pl-12">
          <TimelinePoll
            eventId={event.id}
            question={event.poll_question}
            options={event.poll_options}
          />
        </div>
      )}

      {/* Footer: Reactions + Comments toggle */}
      <div className="flex items-center justify-between mt-3 pl-12">
        <TimelineReactions eventId={event.id} />
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Comentar
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="pl-12">
          <TimelineComments eventId={event.id} />
        </div>
      )}
    </motion.div>
  );
}
