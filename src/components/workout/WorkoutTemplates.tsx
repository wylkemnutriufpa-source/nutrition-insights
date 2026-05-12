import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Input } from "@v1/components/ui/input";
import {
  Layers, Search, Dumbbell, Copy, Target, Zap, Heart,
  Flame, Sparkles, ArrowRight, Edit3
} from "lucide-react";
import {
  BUILT_IN_TEMPLATES,
  TEMPLATE_CATEGORIES,
  LEVEL_LABELS,
  type WorkoutTemplate,
} from "./workoutTemplateData";

const CATEGORY_ICONS: Record<string, any> = {
  all: Layers,
  hypertrophy: Dumbbell,
  fat_loss: Flame,
  strength: Zap,
  functional: Target,
  mobility: Sparkles,
};

const LEVEL_COLORS: Record<string, string> = {
  iniciante: "bg-green-500/10 text-green-600 border-green-500/30",
  intermediario: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  avancado: "bg-red-500/10 text-red-600 border-red-500/30",
};

interface WorkoutTemplatesProps {
  onUseTemplate: (template: WorkoutTemplate) => void;
}

export default function WorkoutTemplates({ onUseTemplate }: WorkoutTemplatesProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  const filtered = BUILT_IN_TEMPLATES.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || t.category === category;
    const matchLevel = levelFilter === "all" || t.level === levelFilter;
    return matchSearch && matchCat && matchLevel;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Templates de Treino</h2>
        <Badge variant="outline" className="text-xs">{BUILT_IN_TEMPLATES.length} templates</Badge>
        <Badge variant="secondary" className="text-xs gap-1"><Edit3 className="w-3 h-3" /> Editáveis</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar template..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TEMPLATE_CATEGORIES.map(c => {
          const Icon = CATEGORY_ICONS[c.value] || Layers;
          return (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                category === c.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Icon className="w-3 h-3" />
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Level filters */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setLevelFilter("all")}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
            levelFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          Todos Níveis
        </button>
        {Object.entries(LEVEL_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setLevelFilter(key)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              levelFilter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filtered.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className="group hover:border-primary/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{t.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">{t.days}x/semana</Badge>
                      <Badge variant="outline" className={`text-[10px] ${LEVEL_COLORS[t.level] || ""}`}>
                        {LEVEL_LABELS[t.level] || t.level}
                      </Badge>
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
