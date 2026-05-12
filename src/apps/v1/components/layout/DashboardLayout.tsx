import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@v1/lib/auth";
import { Button } from "@v1/components/ui/button";
import { Avatar, AvatarFallback } from "@v1/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@v1/components/ui/sheet";
import { LogOut, Moon, Sun, ChevronRight, Settings, Menu, ClipboardCheck, Activity, LayoutDashboard, Users, TrendingUp } from "lucide-react";
import { useIsMobile } from "@v1/hooks/use-mobile";
import FitJourneyLogo from "@v1/components/common/FitJourneyLogo";
import { useWorkspaceContext } from "@v1/hooks/useWorkspaceContext";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut, profile, isNutritionist, isPersonal, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isProfessionalContext } = useWorkspaceContext();

  const toggleDark = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    setDark(isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  const initials = profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??";
  const profileName = profile?.full_name || user?.email?.split("@")[0] || "Usuário";

  const isProRole = useMemo(() => isNutritionist || isPersonal || isAdmin, [isNutritionist, isPersonal, isAdmin]);
  const effectiveProRole = isProRole && isProfessionalContext;

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <div className="flex h-full flex-col bg-card">
      <div className="p-4 flex items-center justify-between border-b border-border/50">
        <FitJourneyLogo collapsed={collapsed} size="sm" />
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {effectiveProRole ? (
          <>
            <Link to="/v1/dashboard" onClick={onLinkClick} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${location.pathname === "/v1/dashboard" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <LayoutDashboard className="w-5 h-5" />
              {!collapsed && <span className="text-sm">Dashboard</span>}
            </Link>
            <Link to="/v1/patients" onClick={onLinkClick} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${location.pathname === "/v1/patients" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <Users className="w-5 h-5" />
              {!collapsed && <span className="text-sm">Pacientes</span>}
            </Link>
            <Link to="/v1/meal-plans" onClick={onLinkClick} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${location.pathname === "/v1/meal-plans" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <ClipboardCheck className="w-5 h-5" />
              {!collapsed && <span className="text-sm">Planos</span>}
            </Link>
          </>
        ) : (
          <>
            <Link to="/v1/client/dashboard" onClick={onLinkClick} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${location.pathname === "/v1/client/dashboard" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <LayoutDashboard className="w-5 h-5" />
              {!collapsed && <span className="text-sm">Início</span>}
            </Link>
            <Link to="/v1/patient-meal-plan" onClick={onLinkClick} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${location.pathname === "/v1/patient-meal-plan" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <Activity className="w-5 h-5" />
              {!collapsed && <span className="text-sm">Minha Dieta</span>}
            </Link>
            <Link to="/v1/checkin" onClick={onLinkClick} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${location.pathname === "/v1/checkin" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <TrendingUp className="w-5 h-5" />
              {!collapsed && <span className="text-sm">Evolução</span>}
            </Link>
          </>
        )}
      </nav>

      <div className="p-3 border-t border-border/50 space-y-1">
        <Link to="/v1/settings" onClick={onLinkClick} className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
          <Settings className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Configurações</span>}
        </Link>
        <button onClick={toggleDark} className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted w-full text-left">
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!collapsed && <span className="text-sm">{dark ? "Modo Claro" : "Modo Escuro"}</span>}
        </button>
        <div className="flex items-center gap-3 px-3 py-3 mt-2">
          <Avatar className="w-8 h-8 border border-border">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && <span className="text-sm font-medium truncate">{profileName}</span>}
        </div>
        <button onClick={() => signOut()} className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full text-left">
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className={`${collapsed ? "w-20" : "w-64"} border-r border-border/50 hidden md:block transition-all duration-300`}>
          <SidebarContent />
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        {isMobile && (
          <header className="h-16 border-b border-border/50 bg-card flex items-center justify-between px-4 shrink-0">
            <FitJourneyLogo size="sm" />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </header>
        )}

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={location.pathname}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}