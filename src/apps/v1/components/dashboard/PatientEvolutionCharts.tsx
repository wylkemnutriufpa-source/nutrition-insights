import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@v1/components/ui/button";

interface EvolutionData {
  avgWeight: number | null;
  avgAdherence: number;
  totalCheckins: number;
  avgScore: number;
}

const periods = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
] as const;

export default function PatientEvolutionCharts({
  data,
  onPeriodChange,
  activePeriod,
}: {
  data: EvolutionData;
  onPeriodChange: (days: number) => void;
  activePeriod: number;
}) {
  const metrics = [
    { label: "Peso Médio", value: data.avgWeight ? `${data.avgWeight.toFixed(1)} kg` : "—", sub: "dos pacientes", color: "text-primary" },
    { label: "Adesão Média", value: `${data.avgAdherence}%`, sub: "ao plano", color: data.avgAdherence >= 70 ? "text-success" : data.avgAdherence >= 40 ? "text-warning" : "text-destructive" },
    { label: "Check-ins", value: data.totalCheckins.toString(), sub: "registros", color: "text-info" },
    { label: "Score Médio", value: data.avgScore.toString(), sub: "de 100", color: data.avgScore >= 70 ? "text-success" : data.avgScore >= 40 ? "text-warning" : "text-destructive" },
  ];

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-info" />
          </div>
          <div>
            <h2 className="font-display font-semibold">Evolução Geral</h2>
            <p className="text-xs text-muted-foreground">Visão consolidada dos pacientes</p>
          </div>
        </div>
        <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                activePeriod === p.value
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-xl bg-muted/30 p-4 text-center"
          >
            <p className={`font-display text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs font-medium mt-1">{m.label}</p>
            <p className="text-[10px] text-muted-foreground">{m.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Mini bar visualization */}
      <div className="mt-4 flex items-end gap-1 h-12 justify-center">
        {Array.from({ length: 14 }).map((_, i) => {
          const h = 20 + Math.random() * 80;
          return (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.3 + i * 0.03, duration: 0.4 }}
              className="w-3 rounded-t gradient-primary opacity-60 hover:opacity-100 transition-opacity"
            />
          );
        })}
      </div>
    </div>
  );
}
