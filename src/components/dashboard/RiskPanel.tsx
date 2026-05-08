import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Shield, Users, ArrowRight } from "lucide-react";

interface RiskPatient {
  id: string;
  name: string;
  score: number;
  risks: string[];
}

export default function RiskPanel({ patients }: { patients: RiskPatient[] }) {
  const navigate = useNavigate();

  const high = patients.filter(p => p.score < 35);
  const medium = patients.filter(p => p.score >= 35 && p.score < 65);
  const low = patients.filter(p => p.score >= 65);

  const categories = [
    { label: "Risco Alto", patients: high, color: "bg-destructive/10 border-destructive/20", badge: "bg-destructive/20 text-destructive", dot: "bg-destructive" },
    { label: "Risco Moderado", patients: medium, color: "bg-warning/10 border-warning/20", badge: "bg-warning/20 text-warning", dot: "bg-warning" },
    { label: "Risco Baixo", patients: low, color: "bg-success/10 border-success/20", badge: "bg-success/20 text-success", dot: "bg-success" },
  ];

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
          <Shield className="w-4 h-4 text-warning" />
        </div>
        <div>
          <h2 className="font-display font-semibold">Painel de Risco</h2>
          <p className="text-xs text-muted-foreground">{patients.length} pacientes analisados</p>
        </div>
      </div>

      {/* Summary bars */}
      <div className="flex gap-2 mb-4">
        {categories.map(cat => (
          <div key={cat.label} className="flex-1 text-center">
            <div className={`rounded-lg ${cat.color} border p-2.5`}>
              <p className="font-display text-xl font-bold">{cat.patients.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{cat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* High risk patients list */}
      {high.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-destructive flex items-center gap-1 mb-2">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            Atenção imediata
          </p>
          {high.slice(0, 4).map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/patients/${p.id}`)}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10 cursor-pointer hover:bg-destructive/10 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center text-xs font-bold text-destructive">
                {p.score}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{p.name}</p>
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  {p.risks.slice(0, 2).map((r, j) => (
                    <span key={j} className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">{r}</span>
                  ))}
                </div>
              </div>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
            </motion.div>
          ))}
        </div>
      )}

      {patients.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Cadastre pacientes com anamnese para ativar o painel de risco.</p>
      )}
    </div>
  );
}
