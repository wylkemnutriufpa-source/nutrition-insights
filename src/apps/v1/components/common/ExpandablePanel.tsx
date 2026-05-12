import { useState, ReactNode } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Maximize2 } from "lucide-react";

interface ExpandablePanelProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export default function ExpandablePanel({ children, title, className }: ExpandablePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative group ${className || ""}`}
    >
      {children}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 w-7 h-7 rounded-lg glass-premium flex items-center justify-center hover:bg-muted metric-glow"
        aria-label="Expandir"
      >
        <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto glass-premium">
          {title && (
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold">{title}</DialogTitle>
            </DialogHeader>
          )}
          <div>{children}</div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
