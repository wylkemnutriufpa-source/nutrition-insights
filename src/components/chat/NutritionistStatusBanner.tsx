import { useNutritionistStatus } from "@/hooks/useNutritionistStatus";
import { MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  patientId: string | undefined;
}

export default function NutritionistStatusBanner({ patientId }: Props) {
  const { isOnline, label, color, nutritionistId } = useNutritionistStatus(patientId);

  if (!nutritionistId) return null;

  const dotColor = color === "green" ? "bg-emerald-500" : color === "yellow" ? "bg-amber-400" : "bg-muted-foreground/50";
  const borderColor = color === "green" ? "border-emerald-500/30" : color === "yellow" ? "border-amber-400/30" : "border-border";
  const bgColor = color === "green" ? "from-emerald-500/10 to-emerald-500/5" : color === "yellow" ? "from-amber-400/10 to-amber-400/5" : "from-muted/30 to-muted/10";

  return (
    <AnimatePresence>
      {isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <Link
            to={`/v1/chat?with=${nutritionistId}`}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${borderColor} bg-gradient-to-r ${bgColor} hover:scale-[1.01] transition-all cursor-pointer`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 text-foreground" />
              <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${dotColor} ${color === "green" ? "animate-pulse" : ""}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{label}</p>
              {isOnline && (
                <p className="text-xs text-muted-foreground">Aproveite para tirar dúvidas ou alinhar seu plano 💬</p>
              )}
            </div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
