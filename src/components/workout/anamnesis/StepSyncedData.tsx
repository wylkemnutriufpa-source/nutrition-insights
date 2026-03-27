import { motion } from "framer-motion";
import { User, Target, Ruler, Weight, Calendar, AlertTriangle, Users, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OrbitalHeader } from "@/components/onboarding/OrbitalAnamnesisInputs";
import type { TrainerAnamnesisData } from "./types";

const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

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
    <div className="w-full max-w-lg mx-auto space-y-5">
      <OrbitalHeader title="Dados Sincronizados" subtitle="Informações já cadastradas no perfil do paciente" />

      <div className="grid grid-cols-2 gap-3">
        {infoItems.map(({ icon: Icon, label, value }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, ease: EASE_PREMIUM }}
            className="relative p-4 rounded-2xl border-2 border-border bg-card/60"
            style={{ boxShadow: "0 2px 8px hsl(0 0% 0% / 0.08)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">{label}</div>
                <div className="text-sm font-semibold text-foreground">{value}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {s.flags && s.flags.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Flags Clínicas</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {s.flags.map(f => (
              <Badge key={f} variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 text-xs">{f}</Badge>
            ))}
          </div>
        </motion.div>
      )}

      {s.restrictions && s.restrictions.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div className="text-sm font-semibold mb-2">Restrições registradas</div>
          <div className="flex flex-wrap gap-1.5">
            {s.restrictions.map(r => (
              <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
            ))}
          </div>
        </motion.div>
      )}

      {professionals && professionals.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Profissionais vinculados</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {professionals.map((p, i) => (
              <Badge key={i} variant="outline" className="text-xs">{p.role}: {p.name}</Badge>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="p-4 rounded-2xl border-2 border-primary/20 bg-primary/5 flex items-center gap-3"
        style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.08)" }}
      >
        <Sparkles className="w-5 h-5 text-primary shrink-0" />
        <p className="text-sm text-primary">
          Dados sincronizados automaticamente. As próximas etapas complementam informações específicas de treino.
        </p>
      </motion.div>
    </div>
  );
}
