import { Pill, Eye, Copy, Pencil, Globe, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PhytotherapyTemplate } from "@/pages/PhytotherapyProtocols";

interface Props {
  template: PhytotherapyTemplate;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  isOwn: boolean;
}

export default function PhytotherapyTemplateCard({ template, onView, onEdit, onDuplicate, isOwn }: Props) {
  const items = template.phytotherapics ?? [];

  return (
    <div className="group relative rounded-xl border border-border/60 bg-card p-5 hover:shadow-lg hover:border-emerald-500/30 transition-all">
      {/* Badge */}
      <div className="absolute top-3 right-3">
        {template.is_global ? (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <Globe className="w-3 h-3" /> Global
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-full">
            <User className="w-3 h-3" /> Próprio
          </span>
        )}
      </div>

      {/* Icon + Title */}
      <div className="flex items-start gap-3 mb-3 pr-16">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <Pill className="w-4.5 h-4.5 text-emerald-500" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">{template.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{template.objective}</p>
        </div>
      </div>

      {/* Phytotherapics list */}
      <div className="space-y-1 mb-4">
        {items.slice(0, 4).map((p, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-foreground/80 truncate">{p.name}</span>
            <span className="text-emerald-500 font-mono text-[11px] flex-shrink-0 ml-2">{p.amount}</span>
          </div>
        ))}
        {items.length > 4 && (
          <p className="text-[11px] text-muted-foreground">+{items.length - 4} ativos</p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-4">
        <span>⏱ {template.duration || "—"}</span>
        <span>💊 {template.dosage || "—"}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={onView}>
          <Eye className="w-3.5 h-3.5" /> Ver
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={onDuplicate}>
          <Copy className="w-3.5 h-3.5" /> Duplicar
        </Button>
        {(isOwn || !template.is_global) && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
