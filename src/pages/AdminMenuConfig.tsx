import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Save, RefreshCw, Settings, GripVertical, Eye, EyeOff,
  ArrowUp, ArrowDown, Crown, LayoutDashboard, Users,
  UtensilsCrossed, Trophy, Target, FileBarChart, Leaf,
  ClipboardCheck, FileText, Rocket, CheckCircle2, Activity,
  MessageSquare, Lightbulb, ChefHat, ShoppingCart, Apple, Camera,
  Palette, Bell, BarChart3, Shield, Zap, Star, Bot,
  Scale, Droplets, Heart, Calculator, TrendingUp, BookOpen,
  DollarSign, Pill, Compass, CalendarDays, Megaphone, Globe,
  UserCheck, Share2, Award, CreditCard, Dumbbell, GraduationCap, Sparkles,
  ChevronDown, ChevronUp, Search
} from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_COLORS, invalidateMenuCache } from "@/hooks/useSmartMenu";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Users, UtensilsCrossed, Trophy, Target, FileBarChart,
  Leaf, ClipboardCheck, FileText, Rocket, CheckCircle2, Activity,
  MessageSquare, Lightbulb, ChefHat, ShoppingCart, Apple, Camera,
  Palette, Bell, BarChart3, Shield, Zap, Star, Bot,
  Scale, Droplets, Heart, Calculator, TrendingUp, BookOpen,
  DollarSign, Pill, Crown, Compass, CalendarDays, Megaphone, Globe,
  UserCheck, Share2, Award, CreditCard, Dumbbell, GraduationCap, Sparkles, Settings,
};

function getIcon(name: string) {
  return ICON_MAP[name] || LayoutDashboard;
}

interface MenuItemRow {
  id: string;
  label: string;
  label_key: string;
  route: string;
  icon: string;
  category: string;
  order_default: number;
  role_visibility: string[];
  premium_only: boolean;
  is_active: boolean;
  icon_color: string | null;
  color: string | null;
  premium_priority_boost: boolean;
}

const ROLES = ["patient", "nutritionist", "personal", "admin"];
const ROLE_LABELS: Record<string, string> = {
  patient: "Paciente",
  nutritionist: "Nutricionista",
  personal: "Personal",
  admin: "Admin",
};
const ROLE_COLORS: Record<string, string> = {
  patient: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  nutritionist: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  personal: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
};
const CATEGORIES = Object.keys(CATEGORY_LABELS);

export default function AdminMenuConfig() {
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES));
  const [activeTab, setActiveTab] = useState("visual");

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .order("category")
      .order("order_default");
    setItems((data as unknown as MenuItemRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const toggleActive = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, is_active: !item.is_active } : item));
  };

  const togglePremium = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, premium_only: !item.premium_only } : item));
  };

  const toggleRole = (id: string, role: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const roles = item.role_visibility.includes(role)
        ? item.role_visibility.filter(r => r !== role)
        : [...item.role_visibility, role];
      return { ...item, role_visibility: roles };
    }));
  };

  const changeCategory = (id: string, category: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, category } : item));
  };

  const moveUp = (id: string, category: string) => {
    setItems(prev => {
      const catItems = prev.filter(i => i.category === category);
      const otherItems = prev.filter(i => i.category !== category);
      const idx = catItems.findIndex(i => i.id === id);
      if (idx <= 0) return prev;
      const temp = catItems[idx].order_default;
      catItems[idx] = { ...catItems[idx], order_default: catItems[idx - 1].order_default };
      catItems[idx - 1] = { ...catItems[idx - 1], order_default: temp };
      [catItems[idx], catItems[idx - 1]] = [catItems[idx - 1], catItems[idx]];
      return [...otherItems, ...catItems].sort((a, b) => a.category.localeCompare(b.category) || a.order_default - b.order_default);
    });
  };

  const moveDown = (id: string, category: string) => {
    setItems(prev => {
      const catItems = prev.filter(i => i.category === category);
      const otherItems = prev.filter(i => i.category !== category);
      const idx = catItems.findIndex(i => i.id === id);
      if (idx < 0 || idx >= catItems.length - 1) return prev;
      const temp = catItems[idx].order_default;
      catItems[idx] = { ...catItems[idx], order_default: catItems[idx + 1].order_default };
      catItems[idx + 1] = { ...catItems[idx + 1], order_default: temp };
      [catItems[idx], catItems[idx + 1]] = [catItems[idx + 1], catItems[idx]];
      return [...otherItems, ...catItems].sort((a, b) => a.category.localeCompare(b.category) || a.order_default - b.order_default);
    });
  };

  const toggleCategoryExpanded = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const item of items) {
        await supabase
          .from("menu_items")
          .update({
            is_active: item.is_active,
            premium_only: item.premium_only,
            role_visibility: item.role_visibility,
            category: item.category,
            order_default: item.order_default,
            label: item.label,
          } as any)
          .eq("id", item.id);
      }
      invalidateMenuCache();
      toast({ title: "✅ Menu salvo!", description: "As configurações foram atualizadas com sucesso." });
    } catch (e) {
      toast({ title: "Erro ao salvar", description: String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, MenuItemRow[]> = {};
    const filtered = search
      ? items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()) || i.route.toLowerCase().includes(search.toLowerCase()))
      : items;
    filtered.forEach(item => {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    });
    return map;
  }, [items, search]);

  const activeCount = items.filter(i => i.is_active).length;
  const inactiveCount = items.filter(i => !i.is_active).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              Organizador de Menu
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Organize visualmente o que aparece no seu menu lateral. Ative, desative e reordene com facilidade.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchItems} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Recarregar
            </Button>
            <Button size="sm" onClick={saveAll} disabled={saving} className="shadow-glow">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Eye className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-emerald-500">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Visíveis</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-muted bg-muted/30">
            <CardContent className="p-4 flex items-center gap-3">
              <EyeOff className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{inactiveCount}</p>
                <p className="text-xs text-muted-foreground">Ocultos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-violet-500/20 bg-violet-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-violet-500" />
              <div>
                <p className="text-2xl font-bold text-violet-500">{Object.keys(grouped).length}</p>
                <p className="text-xs text-muted-foreground">Categorias</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar item do menu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Sections */}
        <div className="space-y-4">
          {CATEGORIES.map(cat => {
            const catItems = grouped[cat];
            if (!catItems || catItems.length === 0) return null;
            const isExpanded = expandedCategories.has(cat);
            const activeInCat = catItems.filter(i => i.is_active).length;
            const colorClass = CATEGORY_COLORS[cat] || "text-muted-foreground";

            return (
              <Card key={cat} className="overflow-hidden">
                <button
                  onClick={() => toggleCategoryExpanded(cat)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-8 rounded-full ${colorClass.replace("text-", "bg-")}`} />
                    <div className="text-left">
                      <h3 className={`font-bold text-sm ${colorClass}`}>
                        {CATEGORY_LABELS[cat]}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {activeInCat}/{catItems.length} itens visíveis
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      {catItems.length} itens
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-2">
                        {catItems.map((item, idx) => {
                          const Icon = getIcon(item.icon);
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                item.is_active
                                  ? "bg-card border-border hover:border-primary/30 hover:shadow-sm"
                                  : "bg-muted/20 border-transparent opacity-60 hover:opacity-80"
                              }`}
                            >
                              {/* Reorder buttons */}
                              <div className="flex flex-col gap-0.5">
                                <button
                                  onClick={() => moveUp(item.id, cat)}
                                  className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                  disabled={idx === 0}
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => moveDown(item.id, cat)}
                                  className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                  disabled={idx === catItems.length - 1}
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Icon */}
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                item.is_active ? "bg-primary/10" : "bg-muted"
                              }`}>
                                <Icon className={`w-4 h-4 ${
                                  item.is_active ? (item.icon_color || "text-primary") : "text-muted-foreground"
                                }`} />
                              </div>

                              {/* Label + route */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${!item.is_active ? "line-through" : ""}`}>
                                  {item.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">{item.route}</p>
                              </div>

                              {/* Roles */}
                              <div className="hidden sm:flex gap-1 flex-shrink-0">
                                {ROLES.map(role => (
                                  <button
                                    key={role}
                                    onClick={() => toggleRole(item.id, role)}
                                    className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium transition-all ${
                                      item.role_visibility.includes(role)
                                        ? ROLE_COLORS[role]
                                        : "bg-transparent border-border/50 text-muted-foreground/40"
                                    }`}
                                  >
                                    {ROLE_LABELS[role].slice(0, 3).toUpperCase()}
                                  </button>
                                ))}
                              </div>

                              {/* Category selector */}
                              <Select value={item.category} onValueChange={v => changeCategory(item.id, v)}>
                                <SelectTrigger className="h-7 w-28 text-xs hidden lg:flex">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CATEGORIES.map(c => (
                                    <SelectItem key={c} value={c} className="text-xs">
                                      {CATEGORY_LABELS[c]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Premium */}
                              {item.premium_only && (
                                <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                              )}

                              {/* Active toggle */}
                              <Switch
                                checked={item.is_active}
                                onCheckedChange={() => toggleActive(item.id)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedCategories(new Set(CATEGORIES))}
            >
              Expandir Tudo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedCategories(new Set())}
            >
              Recolher Tudo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setItems(prev => prev.map(i => ({ ...i, is_active: true })));
                toast({ title: "Todos ativados" });
              }}
            >
              <Eye className="w-3 h-3 mr-1" />
              Ativar Todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setItems(prev => prev.map(i => ({ ...i, is_active: false })));
                toast({ title: "Todos desativados" });
              }}
            >
              <EyeOff className="w-3 h-3 mr-1" />
              Desativar Todos
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
