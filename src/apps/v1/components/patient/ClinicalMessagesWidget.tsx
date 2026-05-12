import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Badge } from "@v1/components/ui/badge";
import { Skeleton } from "@v1/components/ui/skeleton";
import { X, MessageCircle, Lightbulb, Bell, BookOpen } from "lucide-react";
import { DOMAIN_CONFIG } from "@v1/lib/clinicalFlags";

interface ClinicalMessage {
  id: string;
  title: string;
  body: string;
  channel: string;
  priority: number;
  status: string;
  source_flag: string | null;
  message_code: string | null;
  generated_by: string;
}

interface Props {
  patientId?: string;
  channel?: string;
  dismissable?: boolean;
  compact?: boolean;
  limit?: number;
}

const channelIcons: Record<string, any> = {
  dashboard_highlight: Lightbulb,
  notification: Bell,
  modal: BookOpen,
  checklist_hint: MessageCircle,
};

export default function ClinicalMessagesWidget({
  patientId,
  channel,
  dismissable = true,
  compact = false,
  limit = 3, // reduced default to avoid clutter
}: Props) {
  const { user } = useAuth();
  const targetId = patientId || user?.id;
  const [messages, setMessages] = useState<ClinicalMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetId) return;
    let query = supabase
      .from("patient_clinical_messages")
      .select("*")
      .eq("patient_id", targetId)
      .eq("status", "active")
      .order("priority", { ascending: false })
      .limit(limit);

    if (channel) query = query.eq("channel", channel);

    query.then(({ data }) => {
      setMessages((data as ClinicalMessage[]) || []);
      setLoading(false);
    });
  }, [targetId, channel]);

  const dismiss = async (msgId: string) => {
    await supabase
      .from("patient_clinical_messages")
      .update({ status: "dismissed", updated_at: new Date().toISOString() })
      .eq("id", msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  if (loading) {
    return <Skeleton className="h-20 rounded-xl" />;
  }

  if (messages.length === 0) return null;

  // Hero message = highest priority
  const heroMessage = messages[0];
  const secondaryMessages = messages.slice(1);

  const flagCategory = (flag: string | null) => {
    if (!flag) return "geral";
    if (flag.includes("water") || flag.includes("hydra")) return "hidratacao";
    if (flag.includes("gastri") || flag.includes("constip") || flag.includes("reflux") || flag.includes("lactose")) return "digestivo";
    if (flag.includes("sleep") || flag.includes("caffein")) return "sono";
    if (flag.includes("sun") || flag.includes("vitamin") || flag.includes("ferrit")) return "micronutrientes";
    if (flag.includes("training") || flag.includes("strength")) return "performance";
    if (flag.includes("emotional") || flag.includes("anxiety") || flag.includes("binge")) return "comportamental";
    if (flag.includes("insulin") || flag.includes("weight") || flag.includes("muscle")) return "metabolico";
    return "geral";
  };

  const renderMessage = (msg: ClinicalMessage, idx: number, isHero = false) => {
    const cat = flagCategory(msg.source_flag);
    const config = DOMAIN_CONFIG[cat] || DOMAIN_CONFIG.geral;
    const Icon = channelIcons[msg.channel] || Lightbulb;

    return (
      <motion.div
        key={msg.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: idx * 0.05, duration: 0.4 }}
        className={`relative rounded-xl border space-y-1.5 ${
          isHero
            ? "p-5 border-primary/25 bg-primary/8 shadow-sm"
            : "p-4 border-primary/15 bg-primary/5"
        }`}
      >
        {dismissable && (
          <button
            onClick={() => dismiss(msg.id)}
            className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}

        <div className="flex items-center gap-2 pr-6">
          <span className={`${isHero ? "text-lg" : "text-base"}`}>{config.icon}</span>
          <Icon className={`${isHero ? "w-5 h-5" : "w-4 h-4"} text-primary`} />
          <p className={`font-semibold text-foreground ${isHero ? "text-base" : "text-sm"}`}>{msg.title}</p>
        </div>

        {!compact && (
          <p className={`text-muted-foreground leading-relaxed pl-1 ${isHero ? "text-sm" : "text-xs"}`}>
            {msg.body}
          </p>
        )}

        <div className="flex items-center gap-2 pl-1">
          <Badge variant="outline" className="text-[10px] py-0">
            {msg.channel === "dashboard_highlight" ? "Destaque" :
             msg.channel === "checklist_hint" ? "Dica" :
             msg.channel === "notification" ? "Notificação" :
             msg.channel === "modal" ? "Educativo" : msg.channel}
          </Badge>
          {msg.generated_by === "rule_engine" && (
            <Badge variant="secondary" className="text-[10px] py-0 gap-0.5">
              ✨ Automática
            </Badge>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {renderMessage(heroMessage, 0, true)}
        {secondaryMessages.map((msg, idx) => renderMessage(msg, idx + 1))}
      </AnimatePresence>
    </div>
  );
}
