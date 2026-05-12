import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@v1/components/ui/dialog";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Loader2, CalendarDays, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { useMarmitaSettings, type MarmitaSettings } from "@v1/hooks/useMarmitaSettings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export default function MarmitaSettingsDialog({ open, onOpenChange, onSaved }: Props) {
  const { settings, loading, saving, save } = useMarmitaSettings();
  const [draft, setDraft] = useState<MarmitaSettings>(settings);

  useEffect(() => { setDraft(settings); }, [settings, open]);

  const handleSave = async () => {
    const res = await save(draft);
    if (res.ok) {
      toast.success("Configuração salva.");
      onSaved?.();
      onOpenChange(false);
    } else {
      toast.error(res.error || "Falha ao salvar.");
    }
  };

  const NumberField = ({
    label, value, onChange,
  }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      <Input
        type="number"
        min={1}
        max={7}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mínimo de receitas por modo</DialogTitle>
          <DialogDescription className="text-xs">
            Define quantas receitas (de 1 a 7, um por dia da semana) cada modo precisa para liberar a geração.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold">Cardápio Semanal (escalável)</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Almoços mín."
                  value={draft.weekly_min_lunch}
                  onChange={(v) => setDraft({ ...draft, weekly_min_lunch: v })}
                />
                <NumberField
                  label="Jantares mín."
                  value={draft.weekly_min_dinner}
                  onChange={(v) => setDraft({ ...draft, weekly_min_dinner: v })}
                />
              </div>
            </div>

            <div className="rounded-lg border border-accent/40 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-accent" />
                <p className="text-xs font-bold">Marmitas Fixas (congeladas)</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Almoços fixos mín."
                  value={draft.fixed_min_lunch}
                  onChange={(v) => setDraft({ ...draft, fixed_min_lunch: v })}
                />
                <NumberField
                  label="Jantares fixos mín."
                  value={draft.fixed_min_dinner}
                  onChange={(v) => setDraft({ ...draft, fixed_min_dinner: v })}
                />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              💡 Recomendação: 7+7 garante 1 receita diferente por dia da semana.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando…</> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
