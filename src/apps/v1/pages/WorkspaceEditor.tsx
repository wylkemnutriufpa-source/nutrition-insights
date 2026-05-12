import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, Reorder } from "framer-motion";
import { useWorkspace, type WorkspaceSection, type WorkspaceItem } from "@v1/hooks/useWorkspace";
import { supabase } from "@v1/integrations/supabase/client";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@v1/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Switch } from "@v1/components/ui/switch";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import {
  ArrowLeft, Plus, Trash2, GripVertical, Eye, EyeOff, Pin, PinOff,
  RotateCcw, Save, Pencil, ChevronDown, ChevronRight, ArrowRightLeft,
  Heart, TrendingUp, BookOpen, BarChart3, Brain, Settings, Zap, Users,
  Star, Shield, Target, Activity, Sparkles, LayoutDashboard, Search,
  Apple, Award, Bot, CalendarDays, CheckCircle2, ClipboardCheck, Crown,
  DollarSign, Dumbbell, FileText, GraduationCap, Instagram, Lightbulb,
  Megaphone, MessageSquare, Palette, Trophy, X, PlusCircle,
  UtensilsCrossed, ChefHat, Rocket, Pill, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import SubscriptionGuard from "@v1/components/common/SubscriptionGuard";

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

const ALL_ICONS: Record<string, any> = {
  Heart, TrendingUp, BookOpen, BarChart3, Brain, Settings, Zap, Users,
  Star, Shield, Target, Activity, Sparkles, LayoutDashboard,
  Apple, Award, Bot, CalendarDays, CheckCircle2, ClipboardCheck, Crown,
  DollarSign, Dumbbell, FileText, GraduationCap, Instagram, Lightbulb,
  Megaphone, MessageSquare, Palette, Trophy, UtensilsCrossed, ChefHat,
  Rocket, Pill, ArrowRight,
};

interface MenuItem {
  id: string;
  label: string;
  label_key: string;
  route: string;
  icon: string;
  premium_only: boolean;
}

export default function WorkspaceEditor() {
  const {
    sections, items, loading,
    addSection, updateSection, deleteSection, reorderSections,
    moveItem, toggleItemVisibility, togglePin, reorderItems, addItem, removeItem,
    getItemsForSection, resetToDefault,
  } = useWorkspace();

  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionIcon, setNewSectionIcon] = useState("Heart");
  const [newSectionColor, setNewSectionColor] = useState("text-sky-400");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addToolDialog, setAddToolDialog] = useState<string | null>(null); // sectionId
  const [toolSearch, setToolSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Load all available menu items
  useEffect(() => {
    supabase.from("menu_items").select("id, label, label_key, route, icon, premium_only").order("label").then(({ data }) => {
      if (data) setAllMenuItems(data as MenuItem[]);
    });
  }, []);

  // Expand all on load
  useEffect(() => {
    if (sections.length > 0) {
      setExpandedSections(new Set(sections.map(s => s.id)));
    }
  }, [sections.length]);

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

  const handleMoveItem = async (itemId: string, toSectionId: string) => {
    const targetItems = getItemsForSection(toSectionId);
    const newOrder = targetItems.length;
    await moveItem(itemId, toSectionId, newOrder);
    toast.success("Item movido!");
  };

  const handleAddTool = async (sectionId: string, menuItem: MenuItem) => {
    await addItem(sectionId, menuItem.id, {
      label: menuItem.label,
      label_key: menuItem.label_key,
      route: menuItem.route,
      icon: menuItem.icon,
      premium_only: menuItem.premium_only,
    });
    toast.success(`"${menuItem.label}" adicionado!`);
  };

  const handleRemoveItem = async (itemId: string, label: string) => {
    await removeItem(itemId);
    toast.success(`"${label}" removido`);
  };

  // Items already in workspace
  const usedMenuItemIds = new Set(items.map(i => i.menu_item_id));

  // Sort sections consistently
  const sortedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order);

  // Filter available tools - show ALL tools, mark already-added ones
  const getAvailableTools = () => {
    const search = toolSearch.toLowerCase();
    return allMenuItems
      .filter(m => m.label.toLowerCase().includes(search) || m.route.toLowerCase().includes(search))
      .sort((a, b) => {
        const aUsed = usedMenuItemIds.has(a.id) ? 1 : 0;
        const bUsed = usedMenuItemIds.has(b.id) ? 1 : 0;
        return aUsed - bUsed || a.label.localeCompare(b.label);
      });
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
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/v1/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-display font-bold">Editor de Workspace</h1>
              <p className="text-xs text-muted-foreground">Arraste, adicione e organize suas ferramentas</p>
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

        {/* Sections */}
        <Reorder.Group
          axis="y"
          values={sortedSections.map(s => s.id)}
          onReorder={(ids) => reorderSections(ids)}
          className="space-y-3"
        >
          {sortedSections.map(section => {
              const SectionIcon = ALL_ICONS[section.section_icon] || LayoutDashboard;
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
                          <CardTitle className="text-sm font-semibold flex-1">
                            {section.section_name}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">({sectionItems.length})</span>
                          </CardTitle>
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary"
                            title="Adicionar ferramenta"
                            onClick={() => { setAddToolDialog(section.id); setToolSearch(""); }}
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </Button>
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
                          <button
                            onClick={() => { setAddToolDialog(section.id); setToolSearch(""); }}
                            className="w-full py-4 border-2 border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-3.5 h-3.5" /> Adicionar ferramentas aqui
                          </button>
                        ) : (
                          <Reorder.Group
                            axis="y"
                            values={sectionItems.map(i => i.id)}
                            onReorder={(ids) => reorderItems(section.id, ids)}
                            className="space-y-1"
                          >
                            {sectionItems.map(item => {
                              const ItemIcon = ALL_ICONS[item.icon || ""] || LayoutDashboard;
                              return (
                                <Reorder.Item key={item.id} value={item.id}>
                                  <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-all group">
                                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 shrink-0" />
                                    <ItemIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <span className={`text-xs font-medium flex-1 truncate ${!item.is_visible ? "line-through opacity-50" : ""}`}>
                                      {item.custom_label || item.label}
                                    </span>
                                    {item.premium_only && (
                                      <span className="text-[9px] text-amber-500 font-bold">PRO</span>
                                    )}

                                    {/* Move to section */}
                                    <Select onValueChange={(sId) => handleMoveItem(item.id, sId)}>
                                      <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent opacity-50 hover:opacity-100 [&>svg]:hidden">
                                        <ArrowRightLeft className="w-3 h-3" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {sections.filter(s => s.id !== section.id).map(s => (
                                          <SelectItem key={s.id} value={s.id} className="text-xs">
                                            Mover para: {s.section_name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    <button onClick={() => togglePin(item.id)} className="opacity-50 hover:opacity-100 transition-opacity">
                                      {item.is_pinned ? <Pin className="w-3 h-3 text-primary" /> : <PinOff className="w-3 h-3" />}
                                    </button>
                                    <button onClick={() => toggleItemVisibility(item.id)} className="opacity-50 hover:opacity-100 transition-opacity">
                                      {item.is_visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                    </button>
                                    <button onClick={() => handleRemoveItem(item.id, item.label || "Item")} className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity text-destructive">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </Reorder.Item>
                              );
                            })}
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

        {/* Add Tool Dialog */}
        <Dialog open={!!addToolDialog} onOpenChange={(open) => { if (!open) setAddToolDialog(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Ferramenta</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ferramenta..."
                  value={toolSearch}
                  onChange={e => setToolSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-1 pr-3">
                  {getAvailableTools().length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Nenhuma ferramenta encontrada
                    </p>
                  ) : (
                    getAvailableTools().map(tool => {
                      const ToolIcon = ALL_ICONS[tool.icon] || LayoutDashboard;
                      const alreadyAdded = usedMenuItemIds.has(tool.id);
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            if (alreadyAdded) {
                              toast.info(`"${tool.label}" já está no workspace`);
                              return;
                            }
                            addToolDialog && handleAddTool(addToolDialog, tool);
                          }}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left ${
                            alreadyAdded ? "opacity-40 cursor-not-allowed" : "hover:bg-muted/50"
                          }`}
                        >
                          <ToolIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{tool.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{tool.route}</p>
                          </div>
                          {alreadyAdded && <span className="text-[9px] text-muted-foreground">Adicionado</span>}
                          {tool.premium_only && <span className="text-[9px] text-amber-500 font-bold">PRO</span>}
                          {!alreadyAdded && <PlusCircle className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SubscriptionGuard>
  );
}
