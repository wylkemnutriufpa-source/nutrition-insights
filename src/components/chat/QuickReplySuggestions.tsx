import { useQuickReplies } from "@/hooks/useQuickReplies";
import { motion } from "framer-motion";

interface Props {
  patientId: string | null;
  onSelect: (message: string) => void;
}

export default function QuickReplySuggestions({ patientId, onSelect }: Props) {
  const replies = useQuickReplies(patientId);

  if (replies.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {replies.map((r, i) => (
        <motion.button
          key={r.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(r.message)}
          className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 hover:bg-primary/10 hover:border-primary/30 transition-all whitespace-nowrap"
          title={r.message}
        >
          {r.icon} {r.message.length > 35 ? r.message.slice(0, 35) + "…" : r.message}
        </motion.button>
      ))}
    </div>
  );
}
