import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, Reorder } from "framer-motion";
import { useWorkspace, type WorkspaceSection, type WorkspaceItem } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Plus, Trash2, GripVertical, Eye, EyeOff, Pin, PinOff,
  RotateCcw, Save, Pencil, ChevronDown, ChevronRight,
  Heart, TrendingUp, BookOpen, BarChart3, Brain, Settings, Zap, Users,
  Star, Shield, Target, Activity, Sparkles, LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import SubscriptionGuard from "@/components/common/SubscriptionGuard";

const ICON_OPTIONS = [
  { name: "Heart", icon: Heart },
  { name: "TrendingUp", icon: TrendingUp },
  { name: "BookOpen", icon: BookOpen },
  { name: "BarChart3", icon: BarChart3 },
  { name: "Brain", icon: Brain },
  { name: "Settings", icon: Settings },
  { name: "Zap", icon: Zap },
  { name: "Users", icon: Users },
  { name: "Star", icon: Star },
  { name: "Shield", icon: Shield },
  { name: "Target", icon: Target },
  { name: "Activity", icon: Activity },
  { name: "Sparkles", icon: Sparkles },
  { name: "LayoutDashboard", icon: LayoutDashboard },
];

const COLOR_OPTIONS = [
  "text-sky-400", "text-emerald-400", "text-violet-400",
  "text-rose-400", "text-amber-400", "text-cyan-400",
  "text-pink-400", "text-indigo-400",
];

const ICON_MAP: Record<string, any> = Object.fromEntries(ICON_OPTIONS.map(o => [o.name, o.icon]));

export default function WorkspaceEditor() {
  const {
    sections, items, loading,
    addSection, updateSection, deleteSection, reorderSections,
    toggleItemVisibility, togglePin, reorderItems,
    getItemsForSection, resetToDefault,
  } = useWorkspace();

  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionIcon, setNewSectionIcon] = useState("Heart");
  const [newSectionColor, setNewSectionColor] = useState("text-sky-400");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(sections.map(s => s.id)));
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const toggleExpand = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;
    await addSection(newSectionName.trim(), newSectionIcon, newSectionColor);
    setNewSectionName("");
    setAddDialogOpen(false);
    toast.success("Seção criada!");
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm("Remover esta seção e seus itens?")) return;
    await deleteSection(id);
    toast.success("Seção removida");
  };

  const handleRenameSection = async (id: string) => {
    if (!editName.trim()) return;
    await updateSection(id, { section_name: editName.trim() });
    setEditingSection(null);
    toast.success("Seção renomeada");
  };

  const handleSectionReorder = async (newOrder: string[]) => {
    await reorderSections(newOrder);
  };

  const handleItemReorder = async (sectionId: string, newOrder: string[]) => {
    await reorderItems(sectionId, newOrder);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Carregando workspace...</p>
      </div>
    );
  }

  return (
    <SubscriptionGuard featureName="Editor de Workspace" requiredTier="profissional">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-display font-bold">Editor de Workspace</h1>
              <p className="text-xs text-muted-foreground">Configure sua área de trabalho clínica</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="w-4 h-4" /> Nova Seção
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Seção</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Nome da seção</Label>
                    <Input value={newSectionName} onChange={e => setNewSectionName(e.target.value)} placeholder="Ex: Meu Fluxo Diário" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ícone</Label>
                    <div className="grid grid-cols-7 gap-2">
                      {ICON_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.name}
                            onClick={() => setNewSectionIcon(opt.name)}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
                              newSectionIcon === opt.name ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <div className="flex gap-2 flex-wrap">
                      {COLOR_OPTIONS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewSectionColor(c)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${c.replace("text-", "bg-").replace("-400", "-500")} ${
                            newSectionColor === c ? "border-foreground scale-110" : "border-transparent"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleAddSection} className="w-full">Criar Seção</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={() => { if (confirm("Restaurar layout padrão?")) resetToDefault(); }}>
              <RotateCcw className="w-4 h-4" /> Resetar
            </Button>
          </div>
        </div>

        {/* Sections reorderable list */}
        <Reorder.Group
          axis="y"
          values={sections.map(s => s.id)}
          onReorder={handleSectionReorder}
          className="space-y-3"
        >
          {sections
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(section => {
              const SectionIcon = ICON_MAP[section.section_icon] || LayoutDashboard;
              const sectionItems = getItemsForSection(section.id);
              const isExpanded = expandedSections.has(section.id);

              return (
                <Reorder.Item key={section.id} value={section.id}>
                  <Card className="overflow-hidden">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
                        <SectionIcon className={`w-4 h-4 ${section.section_color} shrink-0`} />

                        {editingSection === section.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="h-7 text-sm"
                              autoFocus
                              onKeyDown={e => e.key === "Enter" && handleRenameSection(section.id)}
                            />
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleRenameSection(section.id)}>
                              <Save className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <CardTitle className="text-sm font-semibold flex-1">{section.section_name}</CardTitle>
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                          <Switch
                            checked={section.is_visible}
                            onCheckedChange={(v) => updateSection(section.id, { is_visible: v })}
                            className="scale-75"
                          />
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => { setEditingSection(section.id); setEditName(section.section_name); }}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                            onClick={() => handleDeleteSection(section.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => toggleExpand(section.id)}
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0 pb-3 px-4">
                        {sectionItems.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-3 text-center">Nenhum item nesta seção</p>
                        ) : (
                          <Reorder.Group
                            axis="y"
                            values={sectionItems.map(i => i.id)}
                            onReorder={(ids) => handleItemReorder(section.id, ids)}
                            className="space-y-1"
                          >
                            {sectionItems.map(item => (
                              <Reorder.Item key={item.id} value={item.id}>
                                <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-all group">
                                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100" />
                                  <span className={`text-xs font-medium flex-1 truncate ${!item.is_visible ? "line-through opacity-50" : ""}`}>
                                    {item.custom_label || item.label}
                                  </span>
                                  {item.premium_only && (
                                    <span className="text-[9px] text-amber-500 font-bold">PRO</span>
                                  )}
                                  <button onClick={() => togglePin(item.id)} className="opacity-50 hover:opacity-100 transition-opacity">
                                    {item.is_pinned ? <Pin className="w-3 h-3 text-primary" /> : <PinOff className="w-3 h-3" />}
                                  </button>
                                  <button onClick={() => toggleItemVisibility(item.id)} className="opacity-50 hover:opacity-100 transition-opacity">
                                    {item.is_visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                  </button>
                                </div>
                              </Reorder.Item>
                            ))}
                          </Reorder.Group>
                        )}
                      </CardContent>
                    )}
                  </Card>
                </Reorder.Item>
              );
            })}
        </Reorder.Group>

        {sections.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Nenhuma seção configurada.</p>
            <Button className="mt-4 gap-1.5" onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4" /> Criar primeira seção
            </Button>
          </div>
        )}
      </div>
    </SubscriptionGuard>
  );
}
