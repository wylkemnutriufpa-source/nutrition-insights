import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Layers, Search, Dumbbell, Copy, Target, Zap, Heart,
  Flame, ArrowRight, Sparkles
} from "lucide-react";

const TEMPLATE_CATEGORIES = [
  { value: "all", label: "Todos", icon: Layers },
  { value: "hypertrophy", label: "Hipertrofia", icon: Dumbbell },
  { value: "fat_loss", label: "Emagrecimento", icon: Flame },
  { value: "strength", label: "Força", icon: Zap },
  { value: "functional", label: "Funcional", icon: Target },
  { value: "beginner", label: "Iniciante", icon: Heart },
  { value: "mobility", label: "Mobilidade", icon: Sparkles },
];

// Built-in templates
const BUILT_IN_TEMPLATES = [
  {
    id: "tpl-hyper-push-pull",
    name: "Push/Pull/Legs — Hipertrofia",
    category: "hypertrophy",
    level: "intermediario",
    days: 3,
    description: "Divisão clássica otimizada para ganho muscular",
    routines: [
      { name: "Push (Peito/Ombro/Tríceps)", exercises: [
        { name: "Supino Reto com Barra", muscle_group: "Peito", sets: 4, reps: "8-10", rest_seconds: 90 },
        { name: "Desenvolvimento com Halteres", muscle_group: "Ombros", sets: 3, reps: "10-12", rest_seconds: 60 },
        { name: "Crucifixo Inclinado", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Elevação Lateral", muscle_group: "Ombros", sets: 3, reps: "15", rest_seconds: 45 },
        { name: "Tríceps Corda", muscle_group: "Tríceps", sets: 3, reps: "12-15", rest_seconds: 45 },
      ]},
      { name: "Pull (Costas/Bíceps)", exercises: [
        { name: "Barra Fixa", muscle_group: "Costas", sets: 4, reps: "6-10", rest_seconds: 90 },
        { name: "Remada Curvada", muscle_group: "Costas", sets: 4, reps: "8-10", rest_seconds: 90 },
        { name: "Puxada Frontal", muscle_group: "Costas", sets: 3, reps: "10-12", rest_seconds: 60 },
        { name: "Rosca Direta", muscle_group: "Bíceps", sets: 3, reps: "10-12", rest_seconds: 60 },
        { name: "Rosca Martelo", muscle_group: "Bíceps", sets: 3, reps: "12", rest_seconds: 45 },
      ]},
      { name: "Legs (Pernas/Glúteos)", exercises: [
        { name: "Agachamento Livre", muscle_group: "Pernas", sets: 4, reps: "8-10", rest_seconds: 120 },
        { name: "Leg Press 45°", muscle_group: "Pernas", sets: 4, reps: "10-12", rest_seconds: 90 },
        { name: "Stiff", muscle_group: "Posterior", sets: 3, reps: "10-12", rest_seconds: 60 },
        { name: "Cadeira Extensora", muscle_group: "Quadríceps", sets: 3, reps: "12-15", rest_seconds: 60 },
        { name: "Elevação de Panturrilha", muscle_group: "Panturrilha", sets: 4, reps: "15-20", rest_seconds: 45 },
      ]},
    ],
  },
  {
    id: "tpl-upper-lower",
    name: "Upper/Lower — 4x Semana",
    category: "hypertrophy",
    level: "intermediario",
    days: 4,
    description: "Divisão superior/inferior para frequência 2x por grupo",
    routines: [
      { name: "Upper A", exercises: [
        { name: "Supino Reto", muscle_group: "Peito", sets: 4, reps: "6-8", rest_seconds: 120 },
        { name: "Remada Curvada", muscle_group: "Costas", sets: 4, reps: "6-8", rest_seconds: 90 },
        { name: "Desenvolvimento Militar", muscle_group: "Ombros", sets: 3, reps: "8-10", rest_seconds: 90 },
        { name: "Rosca Direta", muscle_group: "Bíceps", sets: 3, reps: "10-12", rest_seconds: 60 },
        { name: "Tríceps Testa", muscle_group: "Tríceps", sets: 3, reps: "10-12", rest_seconds: 60 },
      ]},
      { name: "Lower A", exercises: [
        { name: "Agachamento Livre", muscle_group: "Pernas", sets: 4, reps: "6-8", rest_seconds: 120 },
        { name: "Stiff", muscle_group: "Posterior", sets: 4, reps: "8-10", rest_seconds: 90 },
        { name: "Leg Press", muscle_group: "Pernas", sets: 3, reps: "10-12", rest_seconds: 90 },
        { name: "Cadeira Flexora", muscle_group: "Posterior", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Panturrilha Sentado", muscle_group: "Panturrilha", sets: 4, reps: "15", rest_seconds: 45 },
      ]},
      { name: "Upper B", exercises: [
        { name: "Supino Inclinado", muscle_group: "Peito", sets: 4, reps: "8-10", rest_seconds: 90 },
        { name: "Puxada Frontal", muscle_group: "Costas", sets: 4, reps: "8-10", rest_seconds: 90 },
        { name: "Elevação Lateral", muscle_group: "Ombros", sets: 3, reps: "12-15", rest_seconds: 60 },
        { name: "Rosca Alternada", muscle_group: "Bíceps", sets: 3, reps: "10-12", rest_seconds: 60 },
        { name: "Tríceps Corda", muscle_group: "Tríceps", sets: 3, reps: "12-15", rest_seconds: 45 },
      ]},
      { name: "Lower B", exercises: [
        { name: "Agachamento Búlgaro", muscle_group: "Pernas", sets: 3, reps: "10 (cada)", rest_seconds: 90 },
        { name: "Levantamento Terra", muscle_group: "Posterior", sets: 4, reps: "6-8", rest_seconds: 120 },
        { name: "Hack Squat", muscle_group: "Quadríceps", sets: 3, reps: "10-12", rest_seconds: 90 },
        { name: "Hip Thrust", muscle_group: "Glúteos", sets: 4, reps: "10-12", rest_seconds: 90 },
        { name: "Panturrilha em Pé", muscle_group: "Panturrilha", sets: 4, reps: "12-15", rest_seconds: 45 },
      ]},
    ],
  },
  {
    id: "tpl-fullbody-beginner",
    name: "Full Body — Iniciante",
    category: "beginner",
    level: "iniciante",
    days: 3,
    description: "Treino completo para quem está começando na academia",
    routines: [
      { name: "Full Body A", exercises: [
        { name: "Agachamento no Smith", muscle_group: "Pernas", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Supino Máquina", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Puxada Frontal", muscle_group: "Costas", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Elevação Lateral", muscle_group: "Ombros", sets: 2, reps: "15", rest_seconds: 45 },
        { name: "Prancha", muscle_group: "Core", sets: 3, reps: "30s", rest_seconds: 30 },
      ]},
      { name: "Full Body B", exercises: [
        { name: "Leg Press", muscle_group: "Pernas", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Remada Sentada", muscle_group: "Costas", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Crucifixo Máquina", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Rosca Direta", muscle_group: "Bíceps", sets: 2, reps: "12", rest_seconds: 45 },
        { name: "Tríceps Corda", muscle_group: "Tríceps", sets: 2, reps: "12", rest_seconds: 45 },
      ]},
      { name: "Full Body C", exercises: [
        { name: "Cadeira Extensora", muscle_group: "Quadríceps", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Cadeira Flexora", muscle_group: "Posterior", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Supino Inclinado Halteres", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Remada Unilateral", muscle_group: "Costas", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Abdominal Crunch", muscle_group: "Core", sets: 3, reps: "15", rest_seconds: 30 },
      ]},
    ],
  },
  {
    id: "tpl-fat-loss",
    name: "Circuito Emagrecimento",
    category: "fat_loss",
    level: "intermediario",
    days: 3,
    description: "Circuitos metabólicos para máxima queima calórica",
    routines: [
      { name: "Circuito A", exercises: [
        { name: "Agachamento com Salto", muscle_group: "Pernas", sets: 3, reps: "15", rest_seconds: 30 },
        { name: "Flexão de Braços", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 30 },
        { name: "Remada Alta", muscle_group: "Costas", sets: 3, reps: "12", rest_seconds: 30 },
        { name: "Mountain Climber", muscle_group: "Core", sets: 3, reps: "30s", rest_seconds: 30 },
        { name: "Burpee", muscle_group: "Cardio", sets: 3, reps: "10", rest_seconds: 45 },
      ]},
      { name: "Circuito B", exercises: [
        { name: "Avanço Alternado", muscle_group: "Pernas", sets: 3, reps: "12 (cada)", rest_seconds: 30 },
        { name: "Kettlebell Swing", muscle_group: "Posterior", sets: 3, reps: "15", rest_seconds: 30 },
        { name: "Push Press", muscle_group: "Ombros", sets: 3, reps: "10", rest_seconds: 30 },
        { name: "Prancha com Toque", muscle_group: "Core", sets: 3, reps: "20", rest_seconds: 30 },
        { name: "Corda Naval", muscle_group: "Cardio", sets: 3, reps: "30s", rest_seconds: 45 },
      ]},
      { name: "Circuito C", exercises: [
        { name: "Thruster", muscle_group: "Pernas", sets: 3, reps: "12", rest_seconds: 30 },
        { name: "TRX Row", muscle_group: "Costas", sets: 3, reps: "12", rest_seconds: 30 },
        { name: "Box Jump", muscle_group: "Pernas", sets: 3, reps: "10", rest_seconds: 30 },
        { name: "Russian Twist", muscle_group: "Core", sets: 3, reps: "20", rest_seconds: 30 },
        { name: "Sprint Esteira", muscle_group: "Cardio", sets: 5, reps: "30s", rest_seconds: 60 },
      ]},
    ],
  },
  {
    id: "tpl-glute-fem",
    name: "Glúteos — Feminino",
    category: "hypertrophy",
    level: "intermediario",
    days: 3,
    description: "Foco em glúteos e membros inferiores para mulheres",
    routines: [
      { name: "Glúteo A", exercises: [
        { name: "Hip Thrust", muscle_group: "Glúteos", sets: 4, reps: "10-12", rest_seconds: 90 },
        { name: "Agachamento Sumô", muscle_group: "Glúteos", sets: 4, reps: "12", rest_seconds: 90 },
        { name: "Stiff Romeno", muscle_group: "Posterior", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Abdução na Máquina", muscle_group: "Glúteos", sets: 3, reps: "15", rest_seconds: 45 },
        { name: "Elevação Pélvica Unilateral", muscle_group: "Glúteos", sets: 3, reps: "12 (cada)", rest_seconds: 60 },
      ]},
      { name: "Glúteo B", exercises: [
        { name: "Agachamento Búlgaro", muscle_group: "Glúteos", sets: 4, reps: "10 (cada)", rest_seconds: 90 },
        { name: "Leg Press Pés Altos", muscle_group: "Glúteos", sets: 4, reps: "12", rest_seconds: 90 },
        { name: "Cadeira Flexora", muscle_group: "Posterior", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Coice no Cabo", muscle_group: "Glúteos", sets: 3, reps: "15 (cada)", rest_seconds: 45 },
        { name: "Panturrilha em Pé", muscle_group: "Panturrilha", sets: 4, reps: "15", rest_seconds: 45 },
      ]},
      { name: "Upper + Core", exercises: [
        { name: "Supino com Halteres", muscle_group: "Peito", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Puxada Frontal", muscle_group: "Costas", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Desenvolvimento Máquina", muscle_group: "Ombros", sets: 3, reps: "12", rest_seconds: 60 },
        { name: "Prancha", muscle_group: "Core", sets: 3, reps: "45s", rest_seconds: 30 },
        { name: "Abdominal Infra", muscle_group: "Core", sets: 3, reps: "15", rest_seconds: 30 },
      ]},
    ],
  },
];

interface WorkoutTemplatesProps {
  onUseTemplate: (template: typeof BUILT_IN_TEMPLATES[0]) => void;
}

export default function WorkoutTemplates({ onUseTemplate }: WorkoutTemplatesProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = BUILT_IN_TEMPLATES.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || t.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Templates Prontos</h2>
        <Badge variant="outline" className="text-xs">{BUILT_IN_TEMPLATES.length} templates</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar template..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TEMPLATE_CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
              category === c.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <c.icon className="w-3 h-3" />
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filtered.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="group hover:border-primary/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-sm">{t.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Badge variant="secondary" className="text-[10px]">{t.days}x/semana</Badge>
                      <Badge variant="outline" className="text-[10px]">{t.level}</Badge>
                      <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      {t.routines.map((r, ri) => (
                        <p key={ri} className="text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">{r.name}</span> — {r.exercises.length} exercícios
                        </p>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUseTemplate(t)}
                    className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <Copy className="w-3 h-3" /> Usar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum template encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
