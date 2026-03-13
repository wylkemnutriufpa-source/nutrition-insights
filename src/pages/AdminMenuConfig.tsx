import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ArrowUp, ArrowDown, Save, RefreshCw, Settings } from "lucide-react";
import { CATEGORY_LABELS } from "@/hooks/useSmartMenu";
import { invalidateMenuCache } from "@/hooks/useSmartMenu";

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
const CATEGORIES = Object.keys(CATEGORY_LABELS);

export default function AdminMenuConfig() {
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

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
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_active: !item.is_active } : item))
    );
  };

  const togglePremium = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, premium_only: !item.premium_only } : item))
    );
  };

  const toggleRole = (id: string, role: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const roles = item.role_visibility.includes(role)
          ? item.role_visibility.filter((r) => r !== role)
          : [...item.role_visibility, role];
        return { ...item, role_visibility: roles };
      })
    );
  };

  const changeCategory = (id: string, category: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, category } : item))
    );
  };

  const moveUp = (id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx <= 0) return prev;
      const item = prev[idx];
      const prevItem = prev[idx - 1];
      if (item.category !== prevItem.category) return prev;
      const updated = [...prev];
      const tempOrder = item.order_default;
      updated[idx] = { ...item, order_default: prevItem.order_default };
      updated[idx - 1] = { ...prevItem, order_default: tempOrder };
      updated.sort((a, b) => a.category.localeCompare(b.category) || a.order_default - b.order_default);
      return updated;
    });
  };

  const moveDown = (id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const item = prev[idx];
      const nextItem = prev[idx + 1];
      if (item.category !== nextItem.category) return prev;
      const updated = [...prev];
      const tempOrder = item.order_default;
      updated[idx] = { ...item, order_default: nextItem.order_default };
      updated[idx + 1] = { ...nextItem, order_default: tempOrder };
      updated.sort((a, b) => a.category.localeCompare(b.category) || a.order_default - b.order_default);
      return updated;
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
      toast({ title: "Menu salvo!", description: "As configurações de menu foram atualizadas." });
    } catch (e) {
      toast({ title: "Erro ao salvar", description: String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filtered = filterCategory === "ALL" ? items : items.filter((i) => i.category === filterCategory);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" />
              Configuração do Menu
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie a visibilidade, ordem e categorias de todos os itens do menu para cada perfil.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchItems} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Recarregar
            </Button>
            <Button onClick={saveAll} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Tudo"}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={filterCategory === "ALL" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilterCategory("ALL")}
          >
            Todos ({items.length})
          </Badge>
          {CATEGORIES.map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            if (count === 0) return null;
            return (
              <Badge
                key={cat}
                variant={filterCategory === cat ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFilterCategory(cat)}
              >
                {CATEGORY_LABELS[cat]} ({count})
              </Badge>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {filterCategory === "ALL" ? "Todos os itens" : CATEGORY_LABELS[filterCategory]}
              <span className="text-muted-foreground font-normal ml-2">({filtered.length} itens)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Ativo</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Rota</TableHead>
                    <TableHead>Ícone</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Visibilidade</TableHead>
                    <TableHead className="w-10">Premium</TableHead>
                    <TableHead className="w-20">Ordem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className={!item.is_active ? "opacity-50" : ""}>
                      <TableCell>
                        <Switch checked={item.is_active} onCheckedChange={() => toggleActive(item.id)} />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.label}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((i) => (i.id === item.id ? { ...i, label: e.target.value } : i))
                            )
                          }
                          className="h-8 w-40"
                        />
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{item.route}</code>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{item.icon}</span>
                      </TableCell>
                      <TableCell>
                        <Select value={item.category} onValueChange={(v) => changeCategory(item.id, v)}>
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {CATEGORY_LABELS[cat]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {ROLES.map((role) => (
                            <Badge
                              key={role}
                              variant={item.role_visibility.includes(role) ? "default" : "outline"}
                              className="cursor-pointer text-[10px] px-1.5 py-0"
                              onClick={() => toggleRole(item.id, role)}
                            >
                              {role === "patient" ? "PAC" : role === "nutritionist" ? "NUT" : role === "personal" ? "PER" : "ADM"}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch checked={item.premium_only} onCheckedChange={() => togglePremium(item.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveUp(item.id)}>
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <span className="text-xs w-6 text-center">{item.order_default}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDown(item.id)}>
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
