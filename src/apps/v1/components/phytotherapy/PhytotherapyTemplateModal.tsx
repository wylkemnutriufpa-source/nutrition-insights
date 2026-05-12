import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pill, Clock, Calendar, AlertTriangle, FileText, Stethoscope } from "lucide-react";
import type { PhytotherapyTemplate } from "@/pages/PhytotherapyProtocols";

interface Props {
  template: PhytotherapyTemplate;
  open: boolean;
  onClose: () => void;
}

export default function PhytotherapyTemplateModal({ template, open, onClose }: Props) {
  const items = template.phytotherapics ?? [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Pill className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <DialogTitle className="text-lg">{template.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{template.objective}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Ativos */}
          <Section icon={<Pill className="w-4 h-4 text-emerald-500" />} title="Fitoterápicos / Ativos">
            <div className="space-y-2">
              {items.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-sm text-emerald-500 font-mono">{p.amount}</span>
                </div>
              ))}
              {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum ativo cadastrado</p>}
            </div>
          </Section>

          {/* Posologia */}
          <Section icon={<Stethoscope className="w-4 h-4 text-sky-500" />} title="Posologia">
            <p className="text-sm">{template.dosage || "Não informada"}</p>
          </Section>

          {/* Horários */}
          <Section icon={<Clock className="w-4 h-4 text-amber-500" />} title="Horários de Uso">
            <p className="text-sm">{template.schedule || "Não informado"}</p>
          </Section>

          {/* Duração */}
          <Section icon={<Calendar className="w-4 h-4 text-violet-500" />} title="Duração">
            <p className="text-sm">{template.duration || "Não informada"}</p>
          </Section>

          {/* Notas Clínicas */}
          {template.clinical_notes && (
            <Section icon={<FileText className="w-4 h-4 text-blue-500" />} title="Observações Clínicas">
              <p className="text-sm whitespace-pre-wrap">{template.clinical_notes}</p>
            </Section>
          )}

          {/* Contraindicações */}
          {template.contraindications && (
            <Section icon={<AlertTriangle className="w-4 h-4 text-red-500" />} title="Contraindicações">
              <p className="text-sm whitespace-pre-wrap text-red-400">{template.contraindications}</p>
            </Section>
          )}

          {/* Instruções ao paciente */}
          {template.patient_instructions && (
            <Section icon={<FileText className="w-4 h-4 text-emerald-500" />} title="Orientações ao Paciente">
              <p className="text-sm whitespace-pre-wrap">{template.patient_instructions}</p>
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
