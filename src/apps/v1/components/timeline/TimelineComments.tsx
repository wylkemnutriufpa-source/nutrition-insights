import { useTimelineComments } from "@v1/hooks/useTimeline";
import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  eventId: string;
}

export default function TimelineComments({ eventId }: Props) {
  const { comments, isLoading, addComment } = useTimelineComments(eventId);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when comments open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addComment(text);
    setText("");
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <AnimatePresence>
        {comments.map((c: any) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-2.5 mb-2.5"
          >
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0 mt-0.5">
              U
            </div>
            <div className="flex-1 min-w-0 bg-muted/40 rounded-xl px-3 py-2">
              <p className="text-xs leading-relaxed text-foreground">{c.comment_text}</p>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 240))}
          placeholder="Escreva um comentário..."
          className="flex-1 bg-muted/50 rounded-xl px-3.5 py-2 text-xs outline-none border border-border/50 focus:border-primary/40 focus:bg-muted/80 transition-all"
          onKeyDown={(e) => {
            // Prevent form resets from parent refreshes
            e.stopPropagation();
          }}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-all shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
