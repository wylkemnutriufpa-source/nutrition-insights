import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, Moon, Sun, ChevronRight, Settings, Menu, ClipboardCheck, Shield, Activity, LayoutDashboard, Dumbbell, Lock, Rocket, RefreshCw, ShieldCheck, Search, Loader2 } from "lucide-react";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import SyncButton from "@/components/common/SyncButton";
import NotificationBell from "@/components/notifications/NotificationBell";
import { openCommandPalette } from "@/components/common/CommandPalette";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSmartMenu } from "@/hooks/useSmartMenu";
import AccordionSidebar from "@/components/layout/AccordionSidebar";
import MobileSidebar from "@/components/layout/MobileSidebar";
import { useProfessionalModules } from "@/hooks/useProfessionalModules";
import PendingApprovalsModal, { usePendingApprovals } from "@/components/patient/PendingApprovalsModal";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import SmartResumeModal from "@/components/common/SmartResumeModal";
import IntelligenceModal from "@/components/common/IntelligenceModal";
import IntelligenceShowcaseModal from "@/components/intelligence/IntelligenceShowcaseModal";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import TrialCountdown from "@/components/common/TrialCountdown";
import ClinicalAIEntity from "@/components/ai-entity/ClinicalAIEntity";
import { usePatientRealtime } from "@/hooks/usePatientRealtime";
import { useNutritionistRealtime } from "@/hooks/useNutritionistRealtime";
import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";
import { useRealtimeEventBus } from "@/hooks/useRealtimeEventBus";
import WorkspaceContextSwitcher from "@/components/layout/WorkspaceContextSwitcher";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import SystemHealthBadge from "./SystemHealthBadge";
import { StabilityZone } from "@/components/common/StabilityZone";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "fj_sidebar_collapsed";

function LayoutFallbackCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Link to="/" className="inline-flex"><Button variant="outline" size="sm">Ir para o início</Button></Link>
      </div>
    </div>
  );
}

function SidebarFallback({ onLinkClick }: { onLinkClick?: () => void }) {
  const { isPatient, isNutritionist, isPersonal, isAdmin } = useAuth();
  const isPro = isNutritionist || isPersonal || isAdmin;

  const fallbackLinks = isPro ? [
    { to: "/dashboard", label: "Início" },
    { to: "/patients", label: "Pacientes" },
    { to: "/editor-v3", label: "Planos" },
    { to: "/recipes", label: "Receitas" },
    { to: "/automation", label: "Automação" },
    { to: "/settings", label: "Configurações" },
  ] : [
    { to: "/client/dashboard", label: "Início" },
    { to: "/journey", label: "Jornada" },
    { to: "/patient-meal-plan", label: "Minha Dieta" },
    { to: "/meals", label: "Refeições" },
    { to: "/recipes", label: "Receitas" },
    { to: "/settings", label: "Configurações" },
  ];

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="border-b border-border px-4 py-5">
        <span className="font-display text-lg font-bold text-foreground">FitJourney</span>
      </div>
      <nav className="flex-1 space-y-2 p-3">
        {fallbackLinks.map((item) => (
          <Link key={item.to} to={item.to} onClick={onLinkClick} className="flex items-center rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function UserAvatarMenu({ initials, profileName, signOut, navigate }: { initials: string; profileName: string; signOut: () => void; navigate: (path: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 w-9 rounded-full p-0 overflow-hidden ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-1">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profileName}</p>
            <p className="text-xs leading-none text-muted-foreground italic">Perfil do Paciente</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
          <Settings className="w-4 h-4 mr-2" /> Configurações de Perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarFooter({ collapsed, dark, toggleDark, initials, profileName, signOut, setCollapsed, onLinkClick, isProRole, mode, isPatient }: any) {
  return (
    <div className="flex-shrink-0 p-3 border-t border-border space-y-2">
      {!collapsed && isProRole && (
        <Link to="/workspace" onClick={() => onLinkClick?.()} className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-all">
          <LayoutDashboard className="w-5 h-5" /><span className="text-sm">Editor Workspace</span>
        </Link>
      )}
      {(!mode?.includes('basic') || isPatient) && (
        <Link to="/settings" onClick={() => onLinkClick?.()} className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-all">
          <Settings className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Configurações</span>}
        </Link>
      )}

      <button onClick={toggleDark} className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-all">
        {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        {!collapsed && <span className="text-sm">{dark ? "Modo claro" : "Modo escuro"}</span>}
      </button>

      <div className="flex items-center gap-3 px-3 py-2">
        <Avatar className="w-8 h-8"><AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback></Avatar>
        {!collapsed && <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{profileName}</p></div>}
      </div>

      <button onClick={() => { signOut(); onLinkClick?.(); }} className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-all">
        <LogOut className="w-5 h-5" />
        {!collapsed && <span className="text-sm">Sair</span>}
      </button>

      {setCollapsed && (
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center w-full py-1 text-muted-foreground hover:text-foreground">
          <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
        </button>
      )}
    </div>
  );
}

function DynamicSidebar({ collapsed, dark, toggleDark, initials, profileName, signOut, setCollapsed, onLinkClick, isPatient }: any) {
  const { categories, flatItems, trackClick, loading: menuLoading } = useSmartMenu();
  const { mode, isFeatureEnabled } = useExperienceMode();
  const { isNutritionist, isPersonal, isAdmin } = useAuth();
  const { isProfessionalContext } = useWorkspaceContext();
  const pendingCount = usePendingApprovals();

  const isProRole = useMemo(() => isNutritionist || isPersonal || isAdmin, [isNutritionist, isPersonal, isAdmin]);
  const effectiveProRole = isProRole && isProfessionalContext;

  return (
    <div className={`flex h-full min-h-0 flex-col transition-colors duration-500 ${mode === 'advanced' ? 'bg-card/40' : mode === 'pro' ? 'bg-blue-500/5' : 'bg-green-700/5'}`}>
      <WorkspaceContextSwitcher collapsed={collapsed} />
      <div className="p-4 flex items-center justify-between flex-shrink-0">
        <FitJourneyLogo collapsed={collapsed} size="sm" />
        {setCollapsed && (
          <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
        )}
      </div>
      <nav className="flex-1 min-h-0 px-3 overflow-y-auto overscroll-contain">
        <ErrorBoundary section="Layout:SidebarNav" fallback={<SidebarFallback onLinkClick={onLinkClick} />}>
          <AccordionSidebar categories={categories} flatItems={flatItems} collapsed={collapsed} isProRole={effectiveProRole} onLinkClick={onLinkClick} trackClick={trackClick} loading={menuLoading} />
        </ErrorBoundary>
      </nav>
      <SidebarFooter collapsed={collapsed} dark={dark} toggleDark={toggleDark} initials={initials} profileName={profileName} signOut={signOut} setCollapsed={setCollapsed} onLinkClick={onLinkClick} isProRole={effectiveProRole} mode={mode} isPatient={isPatient} />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, signOut, isPatient, isNutritionist, isPersonal, isAdmin } = useAuth();
  const { mode } = useExperienceMode();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleDark = () => {
    const newDark = !dark;
    document.documentElement.classList.toggle("dark", newDark);
    setDark(newDark);
  };

  const initials = (profile?.full_name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const profileName = profile?.full_name || "Usuário";
  const sidebarProps = { dark, toggleDark, initials, profileName, signOut, isPatient };

  useRealtimeEventBus();
  usePatientRealtime();
  useNutritionistRealtime();
  useRefetchOnFocus();

  const contentFallback = (
    <LayoutFallbackCard title="Erro no carregamento" description="Esta seção encontrou um problema técnico. Tente recarregar." />
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed top-0 left-0 right-0 z-50 h-16 bg-card border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10"><Menu className="w-5 h-5" /></Button></SheetTrigger>
              <SheetContent side="left" className="p-0 w-[min(300px,88vw)] flex flex-col overflow-hidden !bg-card" aria-describedby={undefined}>
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <MobileSidebar dark={dark} toggleDark={toggleDark} initials={initials} profileName={profileName} signOut={signOut} onLinkClick={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <FitJourneyLogo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserAvatarMenu initials={initials} profileName={profileName} signOut={signOut} navigate={navigate} />
          </div>
        </div>
        <main className="pt-16 pb-safe p-4 max-w-7xl mx-auto">
          <ErrorBoundary section={`PageContent:${location.pathname}`} fallback={contentFallback}>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <motion.aside initial={false} animate={{ width: collapsed ? 72 : 260 }} transition={{ duration: 0.2 }} className={`fixed left-0 top-0 h-screen border-r flex flex-col z-50 ${mode === 'advanced' ? 'border-amber-500/20 bg-card' : mode === 'pro' ? 'border-blue-500/20 bg-card' : 'border-green-700/20 bg-card'}`}>
        <ErrorBoundary section="Layout:DesktopSidebar" fallback={<SidebarFallback />}>
          <DynamicSidebar {...sidebarProps} collapsed={collapsed} setCollapsed={(v: boolean) => setCollapsed(v)} />
        </ErrorBoundary>
      </motion.aside>
      <main className="flex-1 transition-all duration-200" style={{ marginLeft: collapsed ? 72 : 260 }}>
        <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center gap-2"><WorkspaceContextSwitcher collapsed={collapsed} /></div>
          <div className="flex items-center gap-4">
            <SyncButton />
            <SystemHealthBadge />
            <NotificationBell />
            <UserAvatarMenu initials={initials} profileName={profileName} signOut={signOut} navigate={navigate} />
          </div>
        </div>
        <div className="p-6 max-w-7xl mx-auto">
          <ErrorBoundary section={`PageContent:${location.pathname}`} fallback={contentFallback}>
            <StabilityZone name="Dashboard Area">
              {children}
            </StabilityZone>
          </ErrorBoundary>
        </div>
      </main>
      {!isPatient && (
        <ErrorBoundary section="ClinicalAIEntity" fallback={null}>
          <ClinicalAIEntity />
        </ErrorBoundary>
      )}
    </div>
  );
}
