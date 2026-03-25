import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Target, Ruler, Weight, Calendar, AlertTriangle, Users } from "lucide-react";
import type { TrainerAnamnesisData } from "./types";

interface Props {
  data: TrainerAnamnesisData;
  professionals?: { role: string; name: string }[];
}

export default function StepSyncedData({ data, professionals }: Props) {
  const s = data.synced_patient_data;

  const infoItems = [
    { icon: User, label: "Nome", value: s.name },
    { icon: Calendar, label: "Idade", value: s.age ? `${s.age} anos` : null },
    { icon: Ruler, label: "Altura", value: s.height ? `${s.height} cm` : null },
    { icon: Weight, label: "Peso", value: s.weight ? `${s.weight} kg` : null },
    { icon: Target, label: "Objetivo", value: s.goal },
  ].filter(i => i.value);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Dados sincronizados automaticamente do perfil do paciente. Informações já cadastradas no sistema.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {infoItems.map(({ icon: Icon, label, value }) => (
          <Card key={label} className="bg-muted/30 border-border/40">
            <CardContent className="p-3 flex items-center gap-2.5">
              <Icon className="w-4 h-4 text-primary shrink-0" />
              <div>
                <div className="text-[11px] text-muted-foreground">{label}</div>
                <div className="text-sm font-medium">{value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {s.flags && s.flags.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">Flags Clínicas</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {s.flags.map(f => (
              <Badge key={f} variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 text-xs">
                {f}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {s.restrictions && s.restrictions.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-1.5">Restrições registradas</div>
          <div className="flex flex-wrap gap-1.5">
            {s.restrictions.map(r => (
              <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
            ))}
          </div>
        </div>
      )}

      {professionals && professionals.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Profissionais vinculados</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {professionals.map((p, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {p.role}: {p.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-3 text-sm text-primary">
          ✨ Estes dados são sincronizados automaticamente. A anamnese do personal complementa as informações específicas de treino nas próximas etapas.
        </CardContent>
      </Card>
    </div>
  );
}
