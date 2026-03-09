import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard, Users, UtensilsCrossed, Trophy, Target,
  Leaf, LogOut, Moon, Sun, ChevronRight, Sparkles, Settings,
  ClipboardCheck, FileText, Rocket, CheckCircle2, Activity,
  MessageSquare, Lightbulb, ChefHat, ShoppingCart, Apple, Camera,
  Palette, Bell, BarChart3, Menu, X, Shield, Zap, Star, Bot,
  Scale, Droplets, Heart, Calculator, TrendingUp, BookOpen, DollarSign
} from "lucide-react";
} from "lucide-react";
import { useState } from "react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";

const nutritionistLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/patients", icon: Users, label: "Pacientes" },
  { to: "/appointments", icon: Activity, label: "Agenda" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/weekly-goals", icon: Target, label: "Metas" },
  { to: "/protocols", icon: FileText, label: "Protocolos" },
  { to: "/programs", icon: Rocket, label: "Programas" },
  { to: "/automation", icon: Bot, label: "Automação" },
  { to: "/meal-plans", icon: UtensilsCrossed, label: "Planos" },
  { to: "/recipes", icon: ChefHat, label: "Receitas" },
  { to: "/food-database", icon: Apple, label: "Alimentos" },
  { to: "/reports", icon: BarChart3, label: "Relatórios" },
  { to: "/global-tips", icon: Lightbulb, label: "Dicas" },
  { to: "/feedbacks", icon: MessageSquare, label: "Feedbacks" },
  { to: "/branding", icon: Palette, label: "Branding" },
];

const patientLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/checklist", icon: CheckCircle2, label: "Checklist" },
  { to: "/weekly-goals", icon: Target, label: "Metas" },
  { to: "/appointments", icon: Activity, label: "Agenda" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/meals", icon: UtensilsCrossed, label: "Refeições" },
  { to: "/recipes", icon: ChefHat, label: "Receitas" },
  { to: "/shopping-list", icon: ShoppingCart, label: "Compras" },
  { to: "/anamnesis", icon: ClipboardCheck, label: "Anamnese" },
  { to: "/food-database", icon: Apple, label: "Alimentos" },
  { to: "/weight-calculator", icon: Scale, label: "Peso Ideal" },
  { to: "/water-calculator", icon: Droplets, label: "Hidratação" },
  { to: "/health-quiz", icon: Heart, label: "Health Check" },
  { to: "/global-tips", icon: Lightbulb, label: "Dicas" },
  { to: "/feedbacks", icon: MessageSquare, label: "Feedbacks" },
  { to: "/achievements", icon: Trophy, label: "Conquistas" },
  { to: "/challenges", icon: Target, label: "Desafios" },
];

const adminLinks = [
  { to: "/admin", icon: Shield, label: "Painel Admin" },
  { to: "/admin/features", icon: Zap, label: "Feature Flags" },
  { to: "/admin/testimonials", icon: Star, label: "Depoimentos" },
  { to: "/patients", icon: Users, label: "Pacientes" },
  { to: "/appointments", icon: Activity, label: "Agenda" },
  { to: "/automation", icon: Bot, label: "Automação" },
  { to: "/reports", icon: BarChart3, label: "Relatórios" },
  { to: "/food-database", icon: Apple, label: "Alimentos" },
  { to: "/branding", icon: Palette, label: "Branding" },
  { to: "/settings", icon: Settings, label: "Configurações" },
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
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow">
          <Leaf className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display font-bold text-lg">
            Fit<span className="text-gradient">Journey</span>
          </motion.span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const active = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <link.icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-primary" : ""}`} />
              {!collapsed && <span className="text-sm font-medium">{link.label}</span>}
              {active && !collapsed && <ChevronRight className="w-4 h-4 ml-auto text-primary" />}
            </Link>
          );
        })}

        {!isNutritionist && (
          <Link
            to="/analyze"
            onClick={onLinkClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg gradient-primary text-primary-foreground mt-4 shadow-glow"
          >
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Analisar com IA</span>}
          </Link>
        )}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-border space-y-2">
        <Link
          to="/settings"
          onClick={onLinkClick}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-all"
        >
          <Settings className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Configurações</span>}
        </Link>

        <button
          onClick={toggleDark}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-all"
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!collapsed && <span className="text-sm">{dark ? "Modo claro" : "Modo escuro"}</span>}
        </button>

        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="w-8 h-8">
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
      <div className="min-h-screen bg-background">
        {/* Mobile Top Bar */}
        <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 flex flex-col">
                <SidebarContent {...sidebarProps} collapsed={false} onLinkClick={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
                <Leaf className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-sm">
                Fit<span className="text-gradient">Journey</span>
              </span>
            </div>
          </div>
          <NotificationBell />
        </div>

        {/* Main content */}
        <main className="pt-14">
          <div className="p-4 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.2 }}
        className="fixed left-0 top-0 h-screen border-r border-border bg-card flex flex-col z-50"
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
          <div className="flex justify-end">
            <NotificationBell />
          </div>
        </div>
        <div className="p-6 pt-14 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
