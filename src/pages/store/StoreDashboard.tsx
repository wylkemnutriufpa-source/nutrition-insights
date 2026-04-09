import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, FileText, TrendingUp, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export default function StoreDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: productCount = 0 } = useQuery({
    queryKey: ["store-products-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("store_products")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user!.id)
        .eq("is_active", true);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: sheetCount = 0 } = useQuery({
    queryKey: ["technical-sheets-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("technical_sheets")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user!.id)
        .eq("is_active", true);
      return count || 0;
    },
    enabled: !!user,
  });

  const cards = [
    {
      title: "Meus Produtos",
      value: productCount,
      icon: Package,
      description: "Ingredientes cadastrados",
      route: "/store/products",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Fichas Técnicas",
      value: sheetCount,
      icon: FileText,
      description: "Receitas com custo calculado",
      route: "/store/technical-sheets",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Margem Média",
      value: "—",
      icon: TrendingUp,
      description: "Lucro médio por prato",
      route: "/store/technical-sheets",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Custo Total Estoque",
      value: "—",
      icon: DollarSign,
      description: "Valor em estoque",
      route: "/store/products",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏪 Modo Loja</h1>
        <p className="text-muted-foreground">Gerencie seus produtos, fichas técnicas e precificação</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card
            key={card.title}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(card.route)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/store/products")}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <Package className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Cadastrar Produtos</h3>
              <p className="text-sm text-muted-foreground">Adicione ingredientes com preço, estoque e macros</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/store/technical-sheets")}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Ficha Técnica</h3>
              <p className="text-sm text-muted-foreground">Monte receitas, calcule custo e defina margem em tempo real</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
