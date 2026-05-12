import { useState } from "react";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { useAuth } from "@v1/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { Pill, Plus, Search, Copy, Eye, Pencil, Sparkles } from "lucide-react";
import { Input } from "@v1/components/ui/input";
import { Button } from "@v1/components/ui/button";
import { toast } from "sonner";
import PhytotherapyTemplateCard from "@v1/components/phytotherapy/PhytotherapyTemplateCard";
import PhytotherapyTemplateModal from "@v1/components/phytotherapy/PhytotherapyTemplateModal";
import PhytotherapyEditorModal from "@v1/components/phytotherapy/PhytotherapyEditorModal";

export interface PhytotherapyTemplate {
  id: string;
  name: string;
  objective: string;
  phytotherapics: { name: string; amount: string }[];
  dosage: string;
  schedule: string;
  duration: string;
  clinical_notes: string | null;
  contraindications: string | null;
  patient_instructions: string | null;
  is_global: boolean;
  created_by: string | null;
  created_at: string;
}

export default function PhytotherapyProtocols() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewTemplate, setViewTemplate] = useState<PhytotherapyTemplate | null>(null);
  const [editTemplate, setEditTemplate] = useState<PhytotherapyTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["phytotherapy-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phytotherapy_protocol_templates")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
        phytotherapics: Array.isArray(t.phytotherapics) ? t.phytotherapics : [],
      })) as PhytotherapyTemplate[];
    },
    enabled: !!user,
  });

  const duplicateMutation = useMutation({
    mutationFn: async (template: PhytotherapyTemplate) => {
      const { error } = await supabase
        .from("phytotherapy_protocol_templates")
        .insert({
          name: `${template.name} (Cópia)`,
          objective: template.objective,
          phytotherapics: template.phytotherapics as any,
          dosage: template.dosage,
          schedule: template.schedule,
          duration: template.duration,
          clinical_notes: template.clinical_notes,
          contraindications: template.contraindications,
          patient_instructions: template.patient_instructions,
          is_global: false,
          created_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template duplicado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["phytotherapy-templates"] });
    },
    onError: () => toast.error("Erro ao duplicar template"),
  });

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.objective.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Pill className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold">Protocolos Fitoterápicos</h1>
                <p className="text-muted-foreground text-sm">
                  Biblioteca de protocolos fitoterápicos para aplicação clínica
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Protocolo
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar protocolos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            {templates.filter((t) => t.is_global).length} globais
          </span>
          <span>•</span>
          <span>{templates.filter((t) => !t.is_global).length} personalizados</span>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Pill className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Nenhum protocolo encontrado</p>
            <p className="text-sm mt-1">Crie seu primeiro protocolo fitoterápico</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((template) => (
              <PhytotherapyTemplateCard
                key={template.id}
                template={template}
                onView={() => setViewTemplate(template)}
                onEdit={() => setEditTemplate(template)}
                onDuplicate={() => duplicateMutation.mutate(template)}
                isOwn={template.created_by === user?.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewTemplate && (
        <PhytotherapyTemplateModal
          template={viewTemplate}
          open={!!viewTemplate}
          onClose={() => setViewTemplate(null)}
        />
      )}

      {/* Editor Modal */}
      {(editTemplate || isCreating) && (
        <PhytotherapyEditorModal
          template={editTemplate}
          open={!!editTemplate || isCreating}
          onClose={() => { setEditTemplate(null); setIsCreating(false); }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["phytotherapy-templates"] });
            setEditTemplate(null);
            setIsCreating(false);
          }}
        />
      )}
    </DashboardLayout>
  );
}
