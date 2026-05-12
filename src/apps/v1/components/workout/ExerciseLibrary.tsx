import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Input } from "@v1/components/ui/input";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { Card, CardContent } from "@v1/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@v1/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Textarea } from "@v1/components/ui/textarea";
import { toast } from "sonner";
import {
  Search, Plus, Dumbbell, Filter, Play, X, Edit2, Trash2, BookOpen
} from "lucide-react";

const MUSCLE_GROUPS = [
  "Todos", "Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Pernas",
  "Quadríceps", "Posterior", "Glúteos", "Panturrilha", "Core", "Cardio", "Outro"
];

const EQUIPMENT = [
  { value: "barra", label: "Barra" },
  { value: "halteres", label: "Halteres" },
  { value: "maquina", label: "Máquina" },
  { value: "peso_corporal", label: "Peso Corporal" },
  { value: "cabo", label: "Cabo/Polia" },
  { value: "elastico", label: "Elástico" },
  { value: "kettlebell", label: "Kettlebell" },
];

const LEVELS = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
];

interface ExerciseItem {
  id: string;
  name: string;
  muscle_group: string;
  sub_group: string | null;
  equipment: string;
  level: string;
  exercise_type: string;
  description: string | null;
  execution_tips: string | null;
  common_mistakes: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  tags: string[];
  is_system: boolean;
  created_by: string | null;
}

interface ExerciseLibraryProps {
  onSelect?: (exercise: ExerciseItem) => void;
  selectable?: boolean;
}

export default function ExerciseLibrary({ onSelect, selectable = false }: ExerciseLibraryProps) {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("Todos");
  const [levelFilter, setLevelFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailExercise, setDetailExercise] = useState<ExerciseItem | null>(null);

  // Create form
  const [formName, setFormName] = useState("");
  const [formMuscle, setFormMuscle] = useState("Outro");
  const [formSubGroup, setFormSubGroup] = useState("");
  const [formEquipment, setFormEquipment] = useState("peso_livre");
  const [formLevel, setFormLevel] = useState("intermediario");
  const [formDescription, setFormDescription] = useState("");
  const [formTips, setFormTips] = useState("");
  const [formMistakes, setFormMistakes] = useState("");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    const { data } = await (supabase as any)
      .from("exercises_library")
      .select("*")
      .order("muscle_group")
      .order("name");
    setExercises(data || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return exercises.filter((e) => {
      const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
      const matchMuscle = muscleFilter === "Todos" || e.muscle_group === muscleFilter;
      const matchLevel = levelFilter === "all" || e.level === levelFilter;
      return matchSearch && matchMuscle && matchLevel;
    });
  }, [exercises, search, muscleFilter, levelFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, ExerciseItem[]> = {};
    filtered.forEach((e) => {
      const group = e.muscle_group;
      if (!map[group]) map[group] = [];
      map[group].push(e);
    });
    return map;
  }, [filtered]);

  const saveExercise = async () => {
    if (!formName.trim() || !user) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("exercises_library").insert({
        name: formName.trim(),
        muscle_group: formMuscle,
        sub_group: formSubGroup || null,
        equipment: formEquipment,
        level: formLevel,
        description: formDescription || null,
        execution_tips: formTips || null,
        common_mistakes: formMistakes || null,
        video_url: formVideoUrl || null,
        is_system: false,
        created_by: user.id,
        tags: [],
      });
      if (error) throw error;
      toast.success("Exercício criado!");
      setCreateOpen(false);
      resetForm();
      loadExercises();
    } catch {
      toast.error("Erro ao criar exercício");
    }
    setSaving(false);
  };

  const resetForm = () => {
    setFormName(""); setFormMuscle("Outro"); setFormSubGroup(""); setFormEquipment("peso_livre");
    setFormLevel("intermediario"); setFormDescription(""); setFormTips(""); setFormMistakes("");
    setFormVideoUrl("");
  };

  const deleteExercise = async (id: string) => {
    await (supabase as any).from("exercises_library").delete().eq("id", id);
    toast.success("Exercício removido");
    loadExercises();
    setDetailExercise(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Biblioteca de Exercícios</h2>
          <Badge variant="outline" className="text-xs">{exercises.length} exercícios</Badge>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Criar Exercício
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar exercício..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Nível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Níveis</SelectItem>
            {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Muscle Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {MUSCLE_GROUPS.map((mg) => (
          <button
            key={mg}
            onClick={() => setMuscleFilter(mg)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              muscleFilter === mg
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {mg}
          </button>
        ))}
      </div>

      {/* Exercise List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, exs]) => (
            <div key={group}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <Dumbbell className="w-3.5 h-3.5" />
                {group}
                <span className="text-xs font-normal">({exs.length})</span>
              </h3>
              <div className="grid gap-2">
                {exs.map((ex, i) => (
                  <motion.div
                    key={ex.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <Card
                      className={`group transition-all cursor-pointer border-border/50 hover:border-primary/30 ${
                        selectable ? "hover:bg-primary/5" : ""
                      }`}
                      onClick={() => selectable && onSelect ? onSelect(ex) : setDetailExercise(ex)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Dumbbell className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{ex.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="secondary" className="text-[10px] py-0">{ex.equipment}</Badge>
                            <Badge variant="outline" className="text-[10px] py-0">{ex.level}</Badge>
                            {ex.sub_group && (
                              <span className="text-[10px] text-muted-foreground">{ex.sub_group}</span>
                            )}
                          </div>
                        </div>
                        {ex.video_url && (
                          <Play className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                        {selectable && (
                          <Plus className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(grouped).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum exercício encontrado</p>
            </div>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailExercise} onOpenChange={() => setDetailExercise(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" />
              {detailExercise?.name}
            </DialogTitle>
          </DialogHeader>
          {detailExercise && (
            <div className="space-y-3 mt-2">
              <div className="flex gap-1.5 flex-wrap">
                <Badge>{detailExercise.muscle_group}</Badge>
                <Badge variant="secondary">{detailExercise.equipment}</Badge>
                <Badge variant="outline">{detailExercise.level}</Badge>
              </div>
              {detailExercise.description && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Descrição</p>
                  <p className="text-sm">{detailExercise.description}</p>
                </div>
              )}
              {detailExercise.execution_tips && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Dicas de Execução</p>
                  <p className="text-sm">{detailExercise.execution_tips}</p>
                </div>
              )}
              {detailExercise.common_mistakes && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Erros Comuns</p>
                  <p className="text-sm">{detailExercise.common_mistakes}</p>
                </div>
              )}
              {detailExercise.video_url && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Vídeo Tutorial</p>
                  <a href={detailExercise.video_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1">
                    <Play className="w-3 h-3" /> Assistir vídeo
                  </a>
                </div>
              )}
              {!detailExercise.is_system && detailExercise.created_by === user?.id && (
                <div className="flex gap-2 pt-2">
                  <Button variant="destructive" size="sm" onClick={() => deleteExercise(detailExercise.id)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Excluir
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Exercício</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Nome do exercício" value={formName} onChange={(e) => setFormName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={formMuscle} onValueChange={setFormMuscle}>
                <SelectTrigger><SelectValue placeholder="Grupo Muscular" /></SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.filter((m) => m !== "Todos").map((mg) => (
                    <SelectItem key={mg} value={mg}>{mg}</SelectItem>
                  ))}
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Subgrupo (ex: Peitoral Superior)" value={formSubGroup} onChange={(e) => setFormSubGroup(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={formEquipment} onValueChange={setFormEquipment}>
                <SelectTrigger><SelectValue placeholder="Equipamento" /></SelectTrigger>
                <SelectContent>
                  {EQUIPMENT.map((eq) => <SelectItem key={eq.value} value={eq.value}>{eq.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={formLevel} onValueChange={setFormLevel}>
                <SelectTrigger><SelectValue placeholder="Nível" /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Descrição técnica" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2} />
            <Textarea placeholder="Dicas de execução" value={formTips} onChange={(e) => setFormTips(e.target.value)} rows={2} />
            <Textarea placeholder="Erros comuns" value={formMistakes} onChange={(e) => setFormMistakes(e.target.value)} rows={2} />
            <Input placeholder="URL do vídeo tutorial (YouTube, etc)" value={formVideoUrl} onChange={(e) => setFormVideoUrl(e.target.value)} />
            <Button onClick={saveExercise} disabled={saving || !formName.trim()} className="w-full">
              {saving ? "Salvando..." : "✅ Criar Exercício"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
