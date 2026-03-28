import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck, MessageSquare, Camera, AlertTriangle, ClipboardCheck, ChevronRight } from "lucide-react";

interface QueueItem {
  id: string;
  type: string;
  label: string;
  detail: string;
  urgency: "high" | "medium" | "low";
  icon: React.ElementType;
  route: string;
  confidence?: number;
  timestamp: string;
}

const URGENCY_COLORS = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

export default function ClinicalFocusQueue() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const queue: QueueItem[] = [];

        // Pending clinical decisions (plans awaiting approval)
        const { data: decisions } = await (supabase as any)
          .from("clinical_decisions")
          .select("id, title, reason, urgency, confidence, created_at, patient_id")
          .eq("nutritionist_id", user!.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(10);

        for (const d of (decisions ?? [])) {
          queue.push({
            id: `decision-${d.id}`,
            type: "decision",
            label: d.title || "Decisão clínica pendente",
            detail: d.reason?.substring(0, 60) || "",
            urgency: d.urgency === "high" ? "high" : d.urgency === "medium" ? "medium" : "low",
            icon: ClipboardCheck,
            route: `/patients/${d.patient_id}`,
            confidence: d.confidence,
            timestamp: d.created_at,
          });
        }

        // Recent feedbacks
        const { data: feedbacks } = await (supabase as any)
          .from("feedbacks")
          .select("id, message, created_at, user_id")
          .order("created_at", { ascending: false })
          .limit(5);

        for (const f of (feedbacks ?? [])) {
          queue.push({
            id: `feedback-${f.id}`,
            type: "feedback",
            label: "Feedback de paciente",
            detail: f.message?.substring(0, 60) || "Nova mensagem",
            urgency: "medium",
            icon: MessageSquare,
            route: `/patients/${f.user_id}`,
            timestamp: f.created_at,
          });
        }

        // Recent body photos (check-in uploads)
        const { data: photos } = await supabase
          .from("body_assessment_photos")
          .select("id, patient_id, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        for (const p of (photos ?? [])) {
          queue.push({
            id: `photo-${p.id}`,
            type: "photo",
            label: "Foto de evolução enviada",
            detail: "Requer análise visual",
            urgency: "low",
            icon: Camera,
            route: `/patients/${p.patient_id}`,
            timestamp: p.created_at,
          });
        }

        // Action recommendations
        const { data: recs } = await withTenantFilter((supabase as any)
          .from("clinical_action_recommendations")
          .select("id, recommended_action, reason, urgency_level, patient_id, created_at")
          .eq("nutritionist_id", user!.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5), tenantId);

        for (const r of (recs ?? [])) {
          queue.push({
            id: `rec-${r.id}`,
            type: "recommendation",
            label: r.recommended_action?.substring(0, 50) || "Intervenção sugerida",
            detail: r.reason?.substring(0, 60) || "",
            urgency: r.urgency_level === "critical" ? "high" : "medium",
            icon: AlertTriangle,
            route: `/patients/${r.patient_id}`,
            timestamp: r.created_at,
          });
        }

        // Sort by urgency then date
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        queue.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setItems(queue.slice(0, 12));
      } catch (e) {
        console.error("Focus queue error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-[400px] overflow-y-auto scrollbar-hide">
      {items.length === 0 && (
        <p className="text-xs text-white/30 text-center py-8">Nenhuma ação pendente</p>
      )}
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
        >
          <div className={cn("w-1 h-8 rounded-full flex-shrink-0", URGENCY_COLORS[item.urgency])} />
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
            <item.icon className="w-4 h-4 text-white/50" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/80 truncate">{item.label}</p>
            <p className="text-[10px] text-white/35 truncate">{item.detail}</p>
          </div>
          {item.confidence && (
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-white/15 text-white/40 flex-shrink-0">
              {item.confidence}%
            </Badge>
          )}
          <Link to={item.route}>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/20 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
