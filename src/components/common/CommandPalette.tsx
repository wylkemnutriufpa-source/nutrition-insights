import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Users, UtensilsCrossed, Trophy, Target, FileBarChart,
  Leaf, Settings, ClipboardCheck, FileText, Rocket, Activity,
  MessageSquare, Lightbulb, ChefHat, ShoppingCart, Apple, Camera,
  Palette, Bell, BarChart3, Shield, Bot, Scale, Droplets, Heart,
  BookOpen, DollarSign, Pill, Compass, Search, TrendingUp, Zap, Star, Crown
} from "lucide-react";

const allRoutes = [
  // Professional
  { to: "/", icon: LayoutDashboard, label: "Dashboard", roles: ["nutritionist", "admin", "patient"] },
  { to: "/patients", icon: Users, label: "Pacientes", roles: ["nutritionist", "admin"] },
  { to: "/ranking", icon: Trophy, label: "Ranking Global", roles: ["nutritionist", "admin", "patient"] },
  { to: "/checkin-panel", icon: ClipboardCheck, label: "Check-ins", roles: ["nutritionist", "admin"] },
  { to: "/appointments", icon: Activity, label: "Agenda", roles: ["nutritionist", "admin", "patient"] },
  { to: "/chat", icon: MessageSquare, label: "Chat", roles: ["nutritionist", "admin", "patient"] },
  { to: "/weekly-goals", icon: Target, label: "Metas Semanais", roles: ["nutritionist", "admin", "patient"] },
  { to: "/protocols", icon: FileText, label: "Protocolos", roles: ["nutritionist", "admin"] },
  { to: "/programs", icon: Rocket, label: "Programas", roles: ["nutritionist", "admin"] },
  { to: "/automation", icon: Bot, label: "Automação", roles: ["nutritionist", "admin"] },
  { to: "/meal-plans", icon: UtensilsCrossed, label: "Planos Alimentares", roles: ["nutritionist", "admin"] },
  { to: "/diet-templates", icon: BookOpen, label: "Templates de Dieta", roles: ["nutritionist", "admin"] },
  { to: "/recipes", icon: ChefHat, label: "Receitas", roles: ["nutritionist", "admin", "patient"] },
  { to: "/food-database", icon: Apple, label: "Banco de Alimentos", roles: ["nutritionist", "admin", "patient"] },
  { to: "/reports", icon: BarChart3, label: "Relatórios", roles: ["nutritionist", "admin"] },
  { to: "/clinical-intelligence", icon: Activity, label: "Inteligência Clínica", roles: ["nutritionist", "admin"] },
  { to: "/weekly-report", icon: FileBarChart, label: "Relatório Semanal", roles: ["nutritionist", "admin"] },
  { to: "/financial", icon: DollarSign, label: "Financeiro", roles: ["nutritionist", "admin"] },
  { to: "/supplements", icon: Pill, label: "Suplementação", roles: ["nutritionist", "admin", "patient"] },
  { to: "/global-tips", icon: Lightbulb, label: "Dicas", roles: ["nutritionist", "admin", "patient"] },
  { to: "/professional-guide", icon: Compass, label: "Guia do Profissional", roles: ["nutritionist", "admin"] },
  { to: "/user-guide", icon: BookOpen, label: "Guia do Paciente", roles: ["nutritionist", "admin", "patient"] },
  { to: "/branding", icon: Palette, label: "Branding", roles: ["nutritionist", "admin"] },
  { to: "/feedbacks", icon: MessageSquare, label: "Feedbacks", roles: ["nutritionist", "admin", "patient"] },
  { to: "/settings", icon: Settings, label: "Configurações", roles: ["nutritionist", "admin", "patient"] },
  { to: "/notifications", icon: Bell, label: "Notificações", roles: ["nutritionist", "admin", "patient"] },
  // Patient only
  { to: "/meals", icon: Leaf, label: "Refeições", roles: ["patient"] },
  { to: "/checklist", icon: ClipboardCheck, label: "Checklist", roles: ["patient"] },
  { to: "/my-diet", icon: UtensilsCrossed, label: "Minha Dieta", roles: ["patient"] },
  { to: "/chat", icon: MessageSquare, label: "Chat com Nutricionista", roles: ["patient"] },
  { to: "/journey", icon: TrendingUp, label: "Jornada", roles: ["patient"] },
  { to: "/achievements", icon: Trophy, label: "Conquistas", roles: ["patient"] },
  { to: "/challenges", icon: Target, label: "Desafios", roles: ["patient"] },
  { to: "/anamnesis", icon: ClipboardCheck, label: "Anamnese", roles: ["patient"] },
  { to: "/shopping-list", icon: ShoppingCart, label: "Lista de Compras", roles: ["patient"] },
  { to: "/weight-calculator", icon: Scale, label: "Calculadora de Peso", roles: ["patient"] },
  { to: "/water-calculator", icon: Droplets, label: "Calculadora de Água", roles: ["patient"] },
  { to: "/health-quiz", icon: Heart, label: "Health Check Quiz", roles: ["patient"] },
  { to: "/checkin", icon: ClipboardCheck, label: "Check-in", roles: ["patient"] },
  // Admin
  { to: "/admin", icon: Shield, label: "Painel Admin", roles: ["admin"] },
  { to: "/admin/features", icon: Zap, label: "Feature Flags", roles: ["admin"] },
  { to: "/admin/testimonials", icon: Star, label: "Depoimentos", roles: ["admin"] },
  { to: "/admin/pricing", icon: DollarSign, label: "Planos & Preços", roles: ["admin"] },
  { to: "/admin/patient-features", icon: Crown, label: "Features Paciente", roles: ["admin"] },
  { to: "/admin/profissionais", icon: Users, label: "Profissionais", roles: ["admin"] },
  { to: "/admin/growth", icon: TrendingUp, label: "Growth Dashboard", roles: ["admin"] },
  { to: "/admin/prestige", icon: Crown, label: "Prestígio", roles: ["admin"] },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isNutritionist, isPatient, isAdmin } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const userRoles = useMemo(() => {
    const r: string[] = [];
    if (isNutritionist) r.push("nutritionist");
    if (isPatient) r.push("patient");
    if (isAdmin) r.push("admin");
    return r;
  }, [isNutritionist, isPatient, isAdmin]);

  const filteredRoutes = useMemo(
    () => allRoutes.filter((r) => r.roles.some((role) => userRoles.includes(role))),
    [userRoles]
  );

  const handleSelect = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar página ou funcionalidade..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          {filteredRoutes.map((route) => (
            <CommandItem
              key={route.to}
              value={route.label}
              onSelect={() => handleSelect(route.to)}
              className="cursor-pointer"
            >
              <route.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{route.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
