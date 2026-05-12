import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Textarea } from "@v1/components/ui/textarea";
import { Label } from "@v1/components/ui/label";
import { Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { toast } from "sonner";
import type { PhytotherapyTemplate } from "@v1/pages/PhytotherapyProtocols";

interface Props {
  template: PhytotherapyTemplate | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function PhytotherapyEditorModal({ template, open, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const isEditing = !!template;

  const [name, setName] = useState(template?.name ?? "");
  const [objective, setObjective] = useState(template?.objective ?? "");
  const [dosage, setDosage] = useState(template?.dosage ?? "");
  const [schedule, setSchedule] = useState(template?.schedule ?? "");
  const [duration, setDuration] = useState(template?.duration ?? "");
  const [clinicalNotes, setClinicalNotes] = useState(template?.clinical_notes ?? "");
  const [contraindications, setContraindications] = useState(template?.contraindications ?? "");
  const [patientInstructions, setPatientInstructions] = useState(template?.patient_instructions ?? "");
  const [phytotherapics, setPhytotherapics] = useState<{ name: string; amount: string }[]>(
    template?.phytotherapics ?? [{ name: "", amount: "" }]
  );
  const [saving, setSaving] = useState(false);

  const addItem = () => setPhytotherapics([...phytotherapics, { name: "", amount: "" }]);
  const removeItem = (i: number) => setPhytotherapics(phytotherapics.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: "name" | "amount", value: string) => {
    const updated = [...phytotherapics];
    updated[i] = { ...updated[i], [field]: value };
    setPhytotherapics(updated);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        objective: objective.trim(),
        phytotherapics: phytotherapics.filter((p) => p.name.trim()) as any,
        dosage, schedule, duration,
        clinical_notes: clinicalNotes || null,
        contraindications: contraindications || null,
        patient_instructions: patientInstructions || null,
      };

      if (isEditing && template) {
        const { error } = await supabase
          .from("phytotherapy_protocol_templates")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", template.id);
        if (error) throw error;
        toast.success("Protocolo atualizado!");
      } else {
        const { error } = await supabase
          .from("phytotherapy_protocol_templates")
          .insert({ ...payload, is_global: false, created_by: user?.id });
        if (error) throw error;
        toast.success("Protocolo criado!");
      }
      onSaved();
    } catch {
      toast.error("Erro ao salvar protocolo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Protocolo" : "Novo Protocolo Fitoterápico"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nome do Protocolo *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Emagrecimento Metabólico" />
            </div>
            <div>
              <Label>Duração</Label>
              <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ex: 90 dias" />
            </div>
          </div>

          <div>
            <Label>Objetivo Terapêutico</Label>
            <Input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Objetivo do protocolo" />
          </div>

          {/* Phytotherapics list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Fitoterápicos / Ativos</Label>
              <Button variant="ghost" size="sm" onClick={addItem} className="gap-1 text-xs">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {phytotherapics.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={p.name}
                    onChange={(e) => updateItem(i, "name", e.target.value)}
                    placeholder="Nome do ativo"
                    className="flex-1"
                  />
                  <Input
                    value={p.amount}
                    onChange={(e) => updateItem(i, "amount", e.target.value)}
                    placeholder="Dosagem"
                    className="w-32"
                  />
                  {phytotherapics.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="flex-shrink-0">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Posologia</Label>
              <Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="Ex: 1 cápsula 2x/dia" />
            </div>
            <div>
              <Label>Horários de Uso</Label>
              <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="Ex: Manhã e noite" />
            </div>
          </div>

          <div>
            <Label>Observações Clínicas</Label>
            <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Notas clínicas..." rows={3} />
          </div>

          <div>
            <Label>Contraindicações</Label>
            <Textarea value={contraindications} onChange={(e) => setContraindications(e.target.value)} placeholder="Contraindicações..." rows={2} />
          </div>

          <div>
            <Label>Orientações ao Paciente</Label>
            <Textarea value={patientInstructions} onChange={(e) => setPatientInstructions(e.target.value)} placeholder="Instruções para o paciente..." rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
