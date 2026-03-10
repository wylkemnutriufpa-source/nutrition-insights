import { useState, ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Maximize2 } from "lucide-react";

interface ExpandablePanelProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export default function ExpandablePanel({ children, title, className }: ExpandablePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className={`relative cursor-pointer group ${className || ""}`}
      >
        {children}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="w-7 h-7 rounded-lg bg-muted/80 backdrop-blur flex items-center justify-center">
            <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <div className="p-6">
            {title && (
              <h2 className="font-display text-lg font-bold mb-4">{title}</h2>
            )}
            <div onClick={(e) => e.stopPropagation()}>
              {children}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
