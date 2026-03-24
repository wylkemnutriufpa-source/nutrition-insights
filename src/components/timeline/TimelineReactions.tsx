import { useTimelineReactions } from "@/hooks/useTimeline";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EMOJI_OPTIONS = ["❤️", "🔥", "👏", "💪", "🎉", "⭐"];

interface Props {
  eventId: string;
}

export default function TimelineReactions({ eventId }: Props) {
  const { grouped, toggleReaction } = useTimelineReactions(eventId);
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Object.entries(grouped).map(([emoji, { count, userReacted }]) => (
        <button
          key={emoji}
          onClick={() => toggleReaction(emoji)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all hover:scale-105",
            userReacted
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
          )}
        >
          <span>{emoji}</span>
          <span className="font-medium">{count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-xs hover:bg-muted/80 transition-colors"
        >
          +
        </button>
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute bottom-full left-0 mb-1 flex gap-1 bg-card border border-border rounded-lg p-1.5 shadow-lg z-20"
            >
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => { toggleReaction(e); setShowPicker(false); }}
                  className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-sm transition-colors"
                >
                  {e}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
