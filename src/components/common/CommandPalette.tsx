import { useEffect, useState, useMemo, useCallback, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
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
  BookOpen, DollarSign, Pill, Compass, Search, TrendingUp, Zap, Star, Crown,
  User, Dumbbell, CalendarDays, CreditCard
} from "lucide-react";

const allRoutes = [
  // Professional
  { to: "/", icon: LayoutDashboard, label: "Dashboard", roles: ["nutritionist", "admin", "patient", "personal"] },
  { to: "/patients", icon: Users, label: "Pacientes", roles: ["nutritionist", "admin"] },
  { to: "/ranking", icon: Trophy, label: "Ranking Global", roles: ["nutritionist", "admin", "patient", "personal"] },
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
  { to: "/settings", icon: Settings, label: "Configurações", roles: ["nutritionist", "admin", "patient", "personal"] },
  { to: "/notifications", icon: Bell, label: "Notificações", roles: ["nutritionist", "admin", "patient", "personal"] },
  // Patient only
  { to: "/meals", icon: Leaf, label: "Refeições", roles: ["patient"] },
  { to: "/checklist", icon: ClipboardCheck, label: "Checklist", roles: ["patient"] },
  { to: "/my-diet", icon: UtensilsCrossed, label: "Minha Dieta", roles: ["patient"] },
  { to: "/my-workouts", icon: Dumbbell, label: "Meus Treinos", roles: ["patient"] },
  { to: "/journey", icon: TrendingUp, label: "Jornada", roles: ["patient"] },
  { to: "/achievements", icon: Trophy, label: "Conquistas", roles: ["patient"] },
  { to: "/challenges", icon: Target, label: "Desafios", roles: ["patient"] },
  { to: "/anamnesis", icon: ClipboardCheck, label: "Anamnese", roles: ["patient"] },
  { to: "/shopping-list", icon: ShoppingCart, label: "Lista de Compras", roles: ["patient"] },
  { to: "/weight-calculator", icon: Scale, label: "Calculadora de Peso", roles: ["patient"] },
  { to: "/water-calculator", icon: Droplets, label: "Calculadora de Água", roles: ["patient"] },
  { to: "/health-quiz", icon: Heart, label: "Health Check Quiz", roles: ["patient"] },
  { to: "/checkin", icon: ClipboardCheck, label: "Check-in", roles: ["patient"] },
  // Personal
  { to: "/personal/dashboard", icon: LayoutDashboard, label: "Dashboard Personal", roles: ["personal"] },
  { to: "/personal/students", icon: Users, label: "Alunos", roles: ["personal"] },
  { to: "/personal/workouts", icon: Dumbbell, label: "Treinos", roles: ["personal"] },
  // Admin
  { to: "/admin", icon: Shield, label: "Painel Admin", roles: ["admin"] },
  { to: "/admin/features", icon: Zap, label: "Feature Flags", roles: ["admin"] },
  { to: "/admin/testimonials", icon: Star, label: "Depoimentos", roles: ["admin"] },
  { to: "/admin/pricing", icon: DollarSign, label: "Planos & Preços", roles: ["admin"] },
  { to: "/admin/patient-features", icon: Crown, label: "Features Paciente", roles: ["admin"] },
  { to: "/admin/profissionais", icon: Users, label: "Profissionais", roles: ["admin"] },
  { to: "/admin/growth", icon: TrendingUp, label: "Growth Dashboard", roles: ["admin"] },
  { to: "/admin/prestige", icon: Crown, label: "Prestígio & Ranking", roles: ["admin"] },
  { to: "/admin/landing-pages", icon: Palette, label: "Landing Pages", roles: ["admin"] },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Assinaturas", roles: ["admin"] },
  { to: "/admin/booking-settings", icon: CalendarDays, label: "Agenda Pública", roles: ["admin"] },
  { to: "/audit-logs", icon: Shield, label: "Auditoria", roles: ["admin"] },
  { to: "/import-patients", icon: Users, label: "Importar Pacientes", roles: ["nutritionist", "admin"] },
];

// Context to allow opening from external button
const CommandPaletteContext = createContext<{ open: () => void }>({ open: () => {} });
export const useCommandPalette = () => useContext(CommandPaletteContext);

// Global event-based open (for components outside the context tree)
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent("open-command-palette"));
}

interface ProfileResult {
  user_id: string;
  full_name: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  nutritionist: "Nutricionista",
  personal: "Personal",
  patient: "Paciente",
};

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isNutritionist, isPatient, isAdmin, isPersonal } = useAuth();
  const [patients, setPatients] = useState<ProfileResult[]>([]);
  const [professionals, setProfessionals] = useState<ProfileResult[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    const openHandler = () => setIsOpen(true);
    window.addEventListener("open-command-palette", openHandler);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-command-palette", openHandler);
    };
  }, []);

  // Load profiles when palette opens
  useEffect(() => {
    if (!isOpen || dataLoaded) return;
    if (isPatient && !isAdmin && !isNutritionist && !isPersonal) {
      setDataLoaded(true);
      return;
    }

    (async () => {
      if (isAdmin) {
        // Admin: load ALL profiles + their roles
        const [profilesRes, rolesRes] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name").order("full_name").limit(1000),
          supabase.from("user_roles").select("user_id, role").limit(2000),
        ]);
        const profiles = profilesRes.data || [];
        const roles = rolesRes.data || [];

        // Build role map
        const roleMap = new Map<string, string[]>();
        roles.forEach((r: any) => {
          const existing = roleMap.get(r.user_id) || [];
          existing.push(r.role);
          roleMap.set(r.user_id, existing);
        });

        const patientList: ProfileResult[] = [];
        const proList: ProfileResult[] = [];

        profiles.forEach((p) => {
          const userRoles = roleMap.get(p.user_id) || ["patient"];
          const name = p.full_name || "Sem nome";
          const isPro = userRoles.some((r: string) => ["nutritionist", "personal", "admin"].includes(r));

          if (isPro) {
            const mainRole = userRoles.includes("admin") ? "admin" : userRoles.includes("nutritionist") ? "nutritionist" : "personal";
            proList.push({ user_id: p.user_id, full_name: name, role: mainRole });
          }
          if (userRoles.includes("patient") || !isPro) {
            patientList.push({ user_id: p.user_id, full_name: name, role: "patient" });
          }
        });

        setPatients(patientList);
        setProfessionals(proList);
      } else {
        // Nutritionist / Personal: only their linked patients
        const { data: links } = await supabase
          .from("nutritionist_patients")
          .select("patient_id")
          .eq("nutritionist_id", user?.id || "")
          .eq("status", "active");
        if (links && links.length > 0) {
          const ids = links.map(l => l.patient_id);
          const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
          setPatients((profiles || []).map(p => ({ user_id: p.user_id, full_name: p.full_name || "Sem nome", role: "patient" })));
        }
      }
      setDataLoaded(true);
    })();
  }, [isOpen, dataLoaded, isPatient, isNutritionist, isAdmin, isPersonal, user?.id]);

  const userRoles = useMemo(() => {
    const r: string[] = [];
    if (isNutritionist) r.push("nutritionist");
    if (isPatient) r.push("patient");
    if (isAdmin) r.push("admin");
    if (isPersonal) r.push("personal");
    return r;
  }, [isNutritionist, isPatient, isAdmin, isPersonal]);

  const filteredRoutes = useMemo(
    () => allRoutes.filter((r) => r.roles.some((role) => userRoles.includes(role))),
    [userRoles]
  );

  const handleSelect = (to: string) => {
    setIsOpen(false);
    navigate(to);
  };

  const openPalette = useCallback(() => setIsOpen(true), []);

  return (
    <CommandPaletteContext.Provider value={{ open: openPalette }}>
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <CommandInput placeholder="Buscar página, paciente ou ação..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

          {/* Professionals for admin */}
          {professionals.length > 0 && (
            <>
              <CommandGroup heading="Profissionais">
                {professionals.map((p) => (
                  <CommandItem
                    key={`pro-${p.user_id}`}
                    value={`profissional ${p.full_name} ${roleLabels[p.role] || p.role}`}
                    onSelect={() => handleSelect(`/patients/${p.user_id}`)}
                    className="cursor-pointer"
                  >
                    <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{p.full_name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{roleLabels[p.role]}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Patient results for professionals */}
          {patients.length > 0 && (
            <>
              <CommandGroup heading="Pacientes">
                {patients.map((p) => (
                  <CommandItem
                    key={`pat-${p.user_id}`}
                    value={`paciente ${p.full_name}`}
                    onSelect={() => handleSelect(`/patients/${p.user_id}`)}
                    className="cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{p.full_name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

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
    </CommandPaletteContext.Provider>
  );
}
