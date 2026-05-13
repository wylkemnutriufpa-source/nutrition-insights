import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  LogOut, Moon, Sun, ChevronRight, Settings, Menu, ClipboardCheck, Shield,
  Activity, LayoutDashboard, Dumbbell, Lock, Rocket, RefreshCw, ShieldCheck,
  User, Search, Loader2, UserCog,
} from "lucide-react";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import SyncButton from "@/components/common/SyncButton";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSmartMenu } from "@/hooks/useSmartMenu";
import AccordionSidebar from "@/components/layout/AccordionSidebar";
import MobileSidebar from "@/components/layout/MobileSidebar";
import { useProfessionalModules } from "@/hooks/useProfessionalModules";
import PendingApprovalsModal, { usePendingApprovals } from "@/components/patient/PendingApprovalsModal";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import SmartResumeModal from "@/components/common/SmartResumeModal";
import IntelligenceModal from "@/components/intelligence/IntelligenceModal";
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

function UserAvatarMenu({ initials, profileName, signOut, navigate }: { initials: string; profileName: string; signOut: () => void; navigate: (path: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="px-2 py-1 text-xs text-muted-foreground">{profileName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <Settings className="w-4 h-4 mr-2" /> Configurações
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarFooter({ collapsed, dark, toggleDark, initials, profileName, signOut, setCollapsed, onLinkClick, isProRole, mode, isPatient }: any) {
  const navigate = useNavigate();
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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, signOut, isPatient, isNutritionist, isPersonal, isAdmin } = useAuth();
  const { mode } = useExperienceMode();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (profile?.full_name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const profileName = profile?.full_name || "Usuário";
  const isProRole = isNutritionist || isPersonal || isAdmin;

  const toggleDark = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    setDark(isDark);
  };

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <div className="min-h-screen flex bg-background">
      {!isMobile ? (
        <motion.aside 
          initial={false}
          animate={{ width: collapsed ? 72 : 260 }}
          className="flex flex-col border-r border-border bg-card/50 backdrop-blur-sm"
        >
          <div className="p-4 flex items-center gap-2">
            <FitJourneyLogo size="sm" />
            {!collapsed && <span className="font-bold text-lg">FitJourney</span>}
          </div>
          <ScrollArea className="flex-1">
            <AccordionSidebar collapsed={collapsed} />
          </ScrollArea>
          <SidebarFooter 
            collapsed={collapsed} 
            dark={dark} 
            toggleDark={toggleDark} 
            initials={initials} 
            profileName={profileName} 
            signOut={signOut} 
            setCollapsed={setCollapsed} 
            isProRole={isProRole}
            mode={mode}
            isPatient={isPatient}
          />
        </motion.aside>
      ) : (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <MobileSidebar onLinkClick={() => setMobileOpen(false)} />
            <SidebarFooter 
              collapsed={false} 
              dark={dark} 
              toggleDark={toggleDark} 
              initials={initials} 
              profileName={profileName} 
              signOut={signOut} 
              onLinkClick={() => setMobileOpen(false)}
              isProRole={isProRole}
              mode={mode}
              isPatient={isPatient}
            />
          </SheetContent>
        </Sheet>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {isMobile && <div className="w-10" />}
            <WorkspaceContextSwitcher />
          </div>
          <div className="flex items-center gap-4">
            <SystemHealthBadge />
            <NotificationBell />
            <UserAvatarMenu initials={initials} profileName={profileName} signOut={signOut} navigate={navigate} />
          </div>
        </header>
        <ErrorBoundary>
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </div>
        </ErrorBoundary>
      </main>
    </div>
  );
}
