import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard, Users, UtensilsCrossed, Trophy, Target, FileBarChart,
  Leaf, LogOut, Moon, Sun, ChevronRight, Sparkles, Settings,
  ClipboardCheck, FileText, Rocket, CheckCircle2, Activity,
  MessageSquare, Lightbulb, ChefHat, ShoppingCart, Apple, Camera,
  Palette, Bell, BarChart3, Menu, X, Shield, Zap, Star, Bot,
  Scale, Droplets, Heart, Calculator, TrendingUp, BookOpen, DollarSign, Pill, Crown, Compass
} from "lucide-react";
import { useState } from "react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePresenceTracker } from "@/hooks/usePresenceTracker";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import CommandPalette from "@/components/common/CommandPalette";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

const nutritionistLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/ranking", icon: Trophy, label: "🏆 Ranking Global" },
  { to: "/patients", icon: Users, label: "Pacientes" },
  { to: "/checkin-panel", icon: ClipboardCheck, label: "Check-ins" },
  { to: "/appointments", icon: Activity, label: "Agenda" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/weekly-goals", icon: Target, label: "Metas" },
  { to: "/protocols", icon: FileText, label: "Protocolos" },
  { to: "/programs", icon: Rocket, label: "Programas" },
  { to: "/automation", icon: Bot, label: "Automação" },
  { to: "/meal-plans", icon: UtensilsCrossed, label: "Planos" },
  { to: "/diet-templates", icon: BookOpen, label: "Templates" },
  { to: "/recipes", icon: ChefHat, label: "Receitas" },
  { to: "/food-database", icon: Apple, label: "Alimentos" },
  { to: "/reports", icon: BarChart3, label: "Relatórios" },
  { to: "/clinical-intelligence", icon: Activity, label: "Intel. Clínica" },
  { to: "/weekly-report", icon: FileBarChart, label: "Relatório Semanal" },
  { to: "/financial", icon: DollarSign, label: "Financeiro" },
  { to: "/supplements", icon: Pill, label: "Suplementação" },
  { to: "/global-tips", icon: Lightbulb, label: "Dicas" },
  { to: "/professional-guide", icon: Compass, label: "Guia do Profissional" },
  { to: "/user-guide", icon: BookOpen, label: "Guia do Paciente" },
  { to: "/feedbacks", icon: MessageSquare, label: "Feedbacks" },
  { to: "/branding", icon: Palette, label: "Branding" },
];

const patientLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  { to: "/ranking", icon: Trophy, label: "🏆 Ranking", color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
  { to: "/checkin", icon: ClipboardCheck, label: "Check-in", color: "from-accent/20 to-accent/5", iconColor: "text-accent" },
  { to: "/checklist", icon: CheckCircle2, label: "Checklist", color: "from-success/20 to-success/5", iconColor: "text-success" },
  { to: "/my-diet", icon: UtensilsCrossed, label: "Minha Dieta", color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
  { to: "/weekly-goals", icon: Target, label: "Metas", color: "from-info/20 to-info/5", iconColor: "text-info" },
  { to: "/appointments", icon: Activity, label: "Agenda", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  { to: "/chat", icon: MessageSquare, label: "Chat", color: "from-accent/20 to-accent/5", iconColor: "text-accent" },
  { to: "/autobot", icon: Bot, label: "AutoBot IA", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  { to: "/meals", icon: Leaf, label: "Refeições", color: "from-success/20 to-success/5", iconColor: "text-success" },
  { to: "/recipes", icon: ChefHat, label: "Receitas", color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
  { to: "/shopping-list", icon: ShoppingCart, label: "Compras", color: "from-info/20 to-info/5", iconColor: "text-info" },
  { to: "/journey", icon: TrendingUp, label: "Jornada", color: "from-accent/20 to-accent/5", iconColor: "text-accent" },
  { to: "/library", icon: BookOpen, label: "Biblioteca", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  { to: "/supplements", icon: Pill, label: "Suplementos", color: "from-success/20 to-success/5", iconColor: "text-success" },
  { to: "/anamnesis", icon: ClipboardCheck, label: "Anamnese", color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
  { to: "/food-database", icon: Apple, label: "Alimentos", color: "from-info/20 to-info/5", iconColor: "text-info" },
  { to: "/weight-calculator", icon: Scale, label: "Peso Ideal", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  { to: "/water-calculator", icon: Droplets, label: "Hidratação", color: "from-info/20 to-info/5", iconColor: "text-info" },
  { to: "/health-quiz", icon: Heart, label: "Health Check", color: "from-destructive/20 to-destructive/5", iconColor: "text-destructive" },
  { to: "/global-tips", icon: Lightbulb, label: "Dicas", color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
  { to: "/user-guide", icon: Compass, label: "Guia do Usuário", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
  { to: "/feedbacks", icon: MessageSquare, label: "Feedbacks", color: "from-accent/20 to-accent/5", iconColor: "text-accent" },
  { to: "/achievements", icon: Trophy, label: "Conquistas", color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
  { to: "/challenges", icon: Target, label: "Desafios", color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
];

const adminLinks = [
  { to: "/admin", icon: Shield, label: "Painel Admin" },
  { to: "/ranking", icon: Trophy, label: "🏆 Ranking Global" },
  { to: "/admin/resources", icon: LayoutDashboard, label: "Central de Recursos" },
  { to: "/admin/features", icon: Zap, label: "Feature Flags" },
  { to: "/admin/testimonials", icon: Star, label: "Depoimentos" },
  { to: "/patients", icon: Users, label: "Pacientes" },
  { to: "/appointments", icon: Activity, label: "Agenda" },
  { to: "/automation", icon: Bot, label: "Automação" },
  { to: "/reports", icon: BarChart3, label: "Relatórios" },
  { to: "/food-database", icon: Apple, label: "Alimentos" },
  { to: "/branding", icon: Palette, label: "Branding" },
  { to: "/global-tips", icon: Lightbulb, label: "Dicas" },
  { to: "/professional-guide", icon: Compass, label: "Guia do Profissional" },
  { to: "/user-guide", icon: BookOpen, label: "Guia do Paciente" },
  { to: "/admin/pricing", icon: DollarSign, label: "Planos & Preços" },
  { to: "/admin/patient-features", icon: Crown, label: "Features Paciente" },
  { to: "/admin/audit-logs", icon: Shield, label: "Audit Logs" },
];

function SidebarContent({
  links,
  location,
  collapsed,
  isNutritionist,
  dark,
  toggleDark,
  initials,
  profileName,
  signOut,
  setCollapsed,
  onLinkClick,
}: {
  links: typeof nutritionistLinks;
  location: ReturnType<typeof useLocation>;
  collapsed: boolean;
  isNutritionist: boolean;
  dark: boolean;
  toggleDark: () => void;
  initials: string;
  profileName: string;
  signOut: () => void;
  setCollapsed?: (v: boolean) => void;
  onLinkClick?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="p-4">
        <FitJourneyLogo collapsed={collapsed} size="md" />
      </div>

      {/* Nav links */}
      <ScrollArea className="flex-1 px-3 mt-4">
        <nav className="space-y-0.5 pb-4">
          {links.map((link) => {
            const active = location.pathname === link.to;
            const hasColor = 'color' in link && !isNutritionist;
            const linkColor = (link as any).color as string | undefined;
            const linkIconColor = (link as any).iconColor as string | undefined;

            if (hasColor && !collapsed) {
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={onLinkClick}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all group border
                    hover:translate-x-1 hover:scale-[1.02] active:scale-[0.98]
                    ${
                    active
                      ? `bg-gradient-to-r ${linkColor} border-primary/20 shadow-sm`
                      : "border-transparent hover:border-border hover:bg-muted/50"
                  }`}
                  style={{ transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)" }}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    active
                      ? "bg-card shadow-sm animate-pulse"
                      : "bg-muted/50 group-hover:bg-card group-hover:shadow-sm"
                  }`}>
                    <link.icon className={`w-3.5 h-3.5 ${active ? linkIconColor : "text-muted-foreground group-hover:" + (linkIconColor || "text-primary")}`} />
                  </div>
                  <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{link.label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-primary animate-bounce" />}
                </Link>
              );
            }

            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={onLinkClick}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group
                  hover:translate-x-1 hover:scale-[1.02] active:scale-[0.98]
                  ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                style={{ transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)" }}
              >
                <link.icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-primary animate-pulse" : "group-hover:scale-110 transition-transform"}`} />
                {!collapsed && <span className="text-xs font-medium">{link.label}</span>}
                {active && !collapsed && <ChevronRight className="w-3.5 h-3.5 ml-auto text-primary animate-bounce" />}
              </Link>
            );
          })}

          {!isNutritionist && (
            <Link
              to="/analyze"
              onClick={onLinkClick}
              className="flex items-center gap-3 px-3 py-2 rounded-xl gradient-primary text-primary-foreground mt-3 shadow-glow shimmer-sweep"
            >
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="text-xs font-medium">Analisar com IA</span>}
            </Link>
          )}
        </nav>
      </ScrollArea>

      {/* Bottom */}
      <div className="p-3 border-t border-border/50 space-y-2">
        <Link
          to="/settings"
          onClick={onLinkClick}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full transition-all"
        >
          <Settings className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Configurações</span>}
        </Link>

        <button
          onClick={toggleDark}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full transition-all"
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!collapsed && <span className="text-sm">{dark ? "Modo claro" : "Modo escuro"}</span>}
        </button>

        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="w-8 h-8 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profileName}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => { signOut(); onLinkClick?.(); }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-all"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </button>

        {setCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
        )}
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, isNutritionist, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Track presence for all logged-in users
  usePresenceTracker();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const links = isAdmin ? adminLinks : isNutritionist ? nutritionistLinks : patientLinks;

  const toggleDark = () => {
    const newDark = !dark;
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", newDark ? "dark" : "light");
    setDark(newDark);
  };

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const profileName = profile?.full_name || "Usuário";

  const sidebarProps = {
    links, location, isNutritionist, dark, toggleDark, initials, profileName, signOut,
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background particles-bg">
        <CommandPalette />
        <OnboardingWizard />
        {/* Mobile Top Bar */}
        <div className="fixed top-0 left-0 right-0 z-50 h-14 glass-premium border-b border-border/50 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 flex flex-col bg-card/95 backdrop-blur-xl">
                <SidebarContent {...sidebarProps} collapsed={false} onLinkClick={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
                <Leaf className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-sm">
                Fit<span className="text-gradient">Journey</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-1">
            {location.pathname !== "/" && (
              <Link to="/">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <LayoutDashboard className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <NotificationBell />
          </div>
        </div>

        {/* Main content */}
        <main className="pt-14">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="p-4 max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background particles-bg">
      <CommandPalette />
      <OnboardingWizard />
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.2 }}
        className="fixed left-0 top-0 h-screen border-r border-border/50 bg-card/95 backdrop-blur-xl flex flex-col z-50"
      >
        <SidebarContent {...sidebarProps} collapsed={collapsed} setCollapsed={setCollapsed} />
      </motion.aside>

      {/* Main content */}
      <main
        className="flex-1 transition-all duration-200"
        style={{ marginLeft: collapsed ? 72 : 260 }}
      >
        <div
          className="fixed top-0 right-0 z-40 p-3 transition-[left] duration-200"
          style={{ left: collapsed ? 72 : 260 }}
        >
          <div className="flex items-center justify-end gap-1">
            {location.pathname !== "/" && (
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-xs hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
            )}
            <NotificationBell />
          </div>
        </div>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="p-6 pt-14 max-w-7xl mx-auto"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
