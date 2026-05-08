import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { LogOut, Moon, Sun, ChevronRight, Settings, Menu, ClipboardCheck, Shield, Activity, LayoutDashboard, Dumbbell, Lock, Rocket, RefreshCw, ShieldCheck } from "lucide-react";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import SyncButton from "@/components/common/SyncButton";
import { Search, Loader2 } from "lucide-react";
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
import { BetaSwitcher } from "./BetaSwitcher";


const SIDEBAR_COLLAPSED_STORAGE_KEY = "fj_sidebar_collapsed";

function LayoutFallbackCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Link to="/" className="inline-flex">
          <Button variant="outline" size="sm">Ir para o início</Button>
        </Link>
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
          <Link
            key={item.to}
            to={item.to}
            onClick={onLinkClick}
            className="flex items-center rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function SidebarFooter({
  collapsed,
  dark,
  toggleDark,
  initials,
  profileName,
  signOut,
  setCollapsed,
  onLinkClick,
  isProRole,
  mode,
}: {
  collapsed: boolean;
  dark: boolean;
  toggleDark: () => void;
  initials: string;
  profileName: string;
  signOut: () => void;
  setCollapsed?: (v: boolean) => void;
  onLinkClick?: () => void;
  isProRole?: boolean;
  mode?: string;
}) {
  return (
    <div className="flex-shrink-0 p-3 border-t border-border space-y-2">
      {!collapsed && isProRole && (
        <Link
          to="/workspace"
          onClick={() => {
            console.log("[NAV] Sidebar clicking Editor Workspace");
            onLinkClick?.();
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-all"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-sm">Editor Workspace</span>
        </Link>
      )}
      {!mode?.includes('basic') && (
        <Link
          to="/settings"
          onClick={() => {
            console.log("[NAV] Sidebar clicking Configurações");
            onLinkClick?.();
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-all"
        >
          <Settings className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Configurações</span>}
        </Link>
      )}

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
        onClick={() => {
          signOut();
          onLinkClick?.();
        }}
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
  );
}

function DynamicSidebar({
  collapsed,
  dark,
  toggleDark,
  initials,
  profileName,
  signOut,
  setCollapsed,
  onLinkClick,
}: {
  collapsed: boolean;
  dark: boolean;
  toggleDark: () => void;
  initials: string;
  profileName: string;
  signOut: () => void;
  setCollapsed?: (v: boolean) => void;
  onLinkClick?: () => void;
}) {
  const { categories, flatItems, trackClick } = useSmartMenu();
  const { minMode, mode, isFeatureEnabled } = useExperienceMode();
  const { isNutritionist, isPersonal, isAdmin } = useAuth();
  const { isProfessionalContext } = useWorkspaceContext();
  const pendingCount = usePendingApprovals();
  const isMobile = useIsMobile();
  const { coachBodybuilderEnabled, personalTrainerEnabled } = useProfessionalModules();
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const [showcaseOpen, setShowcaseOpen] = useState(false);

  const isProRole = useMemo(() => isNutritionist || isPersonal || isAdmin, [isNutritionist, isPersonal, isAdmin]);
  // Effective role considers workspace context — hybrid users in patient context see patient sidebar
  const effectiveProRole = isProRole && isProfessionalContext;
  const showPending = effectiveProRole && pendingCount > 0;

  return (
    <div className={`flex h-full min-h-0 flex-col transition-colors duration-500 ${
      mode === 'advanced' ? 'bg-card/40' : 
      mode === 'pro' ? 'bg-blue-500/5' : 
      'bg-green-700/5'
    }`}>
      {/* Workspace context switcher for hybrid users */}
      <WorkspaceContextSwitcher collapsed={collapsed} />

      <div className="p-4 flex items-center justify-between flex-shrink-0">
        <FitJourneyLogo collapsed={collapsed} size="sm" />
        {setCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
        )}
      </div>

      {effectiveProRole ? (
        <div className="px-3 mb-1">
          <Link
            to="/intelligence-settings"
            onClick={onLinkClick}
            className={`flex items-center gap-2 w-full rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all px-3 py-2.5 group ${collapsed ? "justify-center" : ""}`}
          >
            <div className="relative flex-shrink-0">
              <motion.div
                className="absolute -inset-1.5 rounded-full"
                style={{
                  background: "radial-gradient(circle, hsl(45 100% 50% / 0.3), transparent 70%)",
                }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.span
                className="text-lg leading-none select-none relative z-10"
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{ filter: "drop-shadow(0 0 6px hsl(45 100% 50% / 0.5))" }}
              >
                🧠
              </motion.span>
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: "1px solid hsl(45 100% 60% / 0.4)" }}
                animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
            </div>
            {!collapsed && (
              <span className="text-xs font-semibold truncate transition-colors"
                style={{
                  background: "linear-gradient(90deg, #FFD700, #FFA500)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Inteligência FitJourney
              </span>
            )}
          </Link>
        </div>
      ) : isFeatureEnabled("ai-insights") && !mode.includes('basic') && (
        <div className="px-3 mb-1">
          <Link
            to="/patient-intelligence"
            onClick={onLinkClick}
            className={`flex items-center gap-2 w-full rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all px-3 py-2.5 group ${collapsed ? "justify-center" : ""}`}
          >
            <div className="relative flex-shrink-0">
              <motion.div
                className="absolute -inset-1.5 rounded-full"
                style={{
                  background: "radial-gradient(circle, hsl(45 100% 50% / 0.3), transparent 70%)",
                }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.span
                className="text-lg leading-none select-none relative z-10"
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{ filter: "drop-shadow(0 0 6px hsl(45 100% 50% / 0.5))" }}
              >
                🧠
              </motion.span>
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: "1px solid hsl(45 100% 60% / 0.4)" }}
                animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
            </div>
            {!collapsed && (
              <span className="text-xs font-semibold truncate transition-colors"
                style={{
                  background: "linear-gradient(90deg, #FFD700, #FFA500)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Inteligência FitJourney
              </span>
            )}
          </Link>
        </div>
      )}

      {effectiveProRole && minMode("pro") && (
        <div className="px-3 mb-1 space-y-1">
          {isFeatureEnabled("analytics") && (
            <Link
              to="/control-tower"
              onClick={onLinkClick}
              className={`flex items-center gap-2 w-full rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 transition-all px-3 py-2.5 group ${collapsed ? "justify-center" : ""}`}
            >
              <div className="relative flex-shrink-0">
                <motion.div
                  className="absolute -inset-1 rounded-full"
                  style={{ background: "radial-gradient(circle, hsl(270 80% 60% / 0.3), transparent 70%)" }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <Activity className="w-4 h-4 text-violet-500 relative z-10" />
              </div>
              {!collapsed && (
                <span className="text-xs font-semibold text-violet-500 truncate group-hover:text-violet-400 transition-colors">
                  Control Tower
                </span>
              )}
            </Link>
          )}

          {/* Cockpit Premium — only for nutritionists and admins */}
          {(isNutritionist || isAdmin) && isFeatureEnabled("automation") && (
            <Link
              to="/cockpit"
              onClick={() => {
                console.log("[NAV] Sidebar clicking Cockpit Premium");
                onLinkClick?.();
              }}
              className={`flex items-center gap-2 w-full rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all px-3 py-2.5 group ${collapsed ? "justify-center" : ""}`}
            >
              <Rocket className="w-4 h-4 text-amber-500 flex-shrink-0" />
              {!collapsed && (
                <span className="text-xs font-semibold text-amber-500 truncate group-hover:text-amber-400 transition-colors">
                  Cockpit Premium
                </span>
              )}
            </Link>
          )}

          {/* Workspace Clínico — only for nutritionists and admins, NOT personal trainers */}
          {(isNutritionist || isAdmin) && isFeatureEnabled("analytics") && (
            <Link
              to="/clinical-workspace"
              onClick={() => {
                console.log("[NAV] Sidebar clicking Workspace Clínico");
                onLinkClick?.();
              }}
              className={`flex items-center gap-2 w-full rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 transition-all px-3 py-2.5 group ${collapsed ? "justify-center" : ""}`}
            >
              <LayoutDashboard className="w-4 h-4 text-sky-500 flex-shrink-0" />
              {!collapsed && (
                <span className="text-xs font-semibold text-sky-500 truncate group-hover:text-sky-400 transition-colors">
                  Workspace Clínico
                </span>
              )}
            </Link>
          )}

          {/* Coach Bodybuilder — only for nutritionists/admins, locked unless admin-enabled */}
          {(isNutritionist || isAdmin) && isFeatureEnabled("protocols") && (
            <div className="relative">
              {!coachBodybuilderEnabled && (
                <div className="absolute inset-0 z-10 rounded-xl bg-muted/60 backdrop-blur-[1px] flex items-center justify-center cursor-not-allowed">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
              <Link
                to={coachBodybuilderEnabled ? "/coach-bodybuilder" : "#"}
                onClick={(e) => { if (!coachBodybuilderEnabled) { e.preventDefault(); return; } onLinkClick?.(); }}
                className={`flex items-center gap-2 w-full rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-all px-3 py-2.5 group ${collapsed ? "justify-center" : ""}`}
              >
                <Activity className="w-4 h-4 text-orange-500 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-xs font-semibold text-orange-500 truncate group-hover:text-orange-400 transition-colors">
                    Coach Bodybuilder
                  </span>
                )}
              </Link>
            </div>
          )}

          {/* Personal Trainer — only for personal trainers and admins, locked unless admin-enabled */}
          {(isPersonal || isAdmin) && isFeatureEnabled("protocols") && (
            <div className="relative">
              {!personalTrainerEnabled && (
                <div className="absolute inset-0 z-10 rounded-xl bg-muted/60 backdrop-blur-[1px] flex items-center justify-center cursor-not-allowed">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
              <Link
                to={personalTrainerEnabled ? "/personal/dashboard" : "#"}
                onClick={(e) => { if (!personalTrainerEnabled) { e.preventDefault(); return; } onLinkClick?.(); }}
                className={`flex items-center gap-2 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all px-3 py-2.5 group ${collapsed ? "justify-center" : ""}`}
              >
                <Dumbbell className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-xs font-semibold text-emerald-500 truncate group-hover:text-emerald-400 transition-colors">
                    Personal Trainer
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>
      )}

      {!effectiveProRole && minMode("pro") && (
        <div className="px-3 mb-1 space-y-1">
          <Link
            to="/onboarding"
            onClick={onLinkClick}
            className={`flex items-center gap-2 w-full rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-all px-3 py-2.5 group ${collapsed ? "justify-center" : ""}`}
          >
            <div className="relative flex-shrink-0">
              <Rocket className="w-4 h-4 text-primary relative z-10" />
            </div>
            {!collapsed && (
              <span className="text-xs font-semibold text-primary truncate group-hover:text-primary/80 transition-colors">
                Onboarding
              </span>
            )}
          </Link>
          <Link
            to="/patient-overview"
            onClick={onLinkClick}
            className={`flex items-center gap-2 w-full rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 transition-all px-3 py-2.5 group ${collapsed ? "justify-center" : ""}`}
          >
            <div className="relative flex-shrink-0">
              <motion.div
                className="absolute -inset-1 rounded-full"
                style={{ background: "radial-gradient(circle, hsl(270 80% 60% / 0.3), transparent 70%)" }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <Activity className="w-4 h-4 text-violet-500 relative z-10" />
            </div>
            {!collapsed && (
              <span className="text-xs font-semibold text-violet-500 truncate group-hover:text-violet-400 transition-colors">
                Meu Painel
              </span>
            )}
          </Link>
        </div>
      )}

      <ErrorBoundary section="Layout:IntelligenceModal" fallback={null}>
        <IntelligenceModal open={intelligenceOpen} onOpenChange={setIntelligenceOpen} />
      </ErrorBoundary>
      <ErrorBoundary section="Layout:IntelligenceShowcase" fallback={null}>
        <IntelligenceShowcaseModal open={showcaseOpen} onClose={() => setShowcaseOpen(false)} />
      </ErrorBoundary>
      <ErrorBoundary section="Layout:SmartResumeModal" fallback={null}>
        <SmartResumeModal />
      </ErrorBoundary>

      <AnimatePresence>
        {showPending && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="px-3 mb-2"
          >
            <button
              onClick={() => setApprovalsOpen(true)}
              className={`flex items-center gap-2 w-full rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all px-3 py-2.5 ${collapsed ? "justify-center" : ""}`}
            >
              <div className="relative flex-shrink-0">
                <ClipboardCheck className="w-4 h-4 text-amber-500" />
                <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              </div>
              {!collapsed && (
                <span className="text-xs font-semibold text-amber-500 truncate">
                  Planos Pendentes
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ErrorBoundary section="Layout:PendingApprovalsModal" fallback={null}>
        <PendingApprovalsModal open={approvalsOpen} onOpenChange={setApprovalsOpen} />
      </ErrorBoundary>

      {isAdmin && (
        <div className="px-3 mb-2 space-y-1">
          <Link
            to="/admin/dashboard"
            onClick={onLinkClick}
            className={`flex items-center gap-2 w-full rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-all px-3 py-2.5 ${collapsed ? "justify-center" : ""}`}
          >
            <div className="relative flex-shrink-0">
              <motion.div
                className="absolute -inset-1 rounded-full"
                style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.25), transparent 70%)" }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <ShieldCheck className="w-4 h-4 text-primary relative z-10" />
            </div>
            {!collapsed && (
              <span className="text-xs font-semibold text-primary truncate">
                Painel Administrativo
              </span>
            )}
          </Link>

          <Link
            to="/admin/diagnostics"
            onClick={onLinkClick}
            className={`flex items-center gap-2 w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all px-3 py-2.5 ${collapsed ? "justify-center" : ""}`}
          >
            <div className="relative flex-shrink-0">
              <motion.div
                className="absolute -inset-1 rounded-full"
                style={{ background: "radial-gradient(circle, hsl(190 80% 50% / 0.25), transparent 70%)" }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <Shield className="w-4 h-4 text-cyan-500 relative z-10" />
            </div>
            {!collapsed && (
              <span className="text-xs font-semibold text-cyan-500 truncate">
                System Diagnostics
              </span>
            )}
          </Link>
        </div>
      )}

      <nav className="flex-1 min-h-0 px-3 overflow-y-auto overscroll-contain">
        <ErrorBoundary section="Layout:SidebarNav" fallback={<SidebarFallback onLinkClick={onLinkClick} />}>
          <AccordionSidebar
            categories={categories}
            flatItems={flatItems}
            collapsed={collapsed}
            isProRole={effectiveProRole}
            onLinkClick={onLinkClick}
            trackClick={trackClick}
          />
        </ErrorBoundary>
      </nav>

      <SidebarFooter
        collapsed={collapsed}
        dark={dark}
        toggleDark={toggleDark}
        initials={initials}
        profileName={profileName}
        signOut={signOut}
        setCollapsed={setCollapsed}
        onLinkClick={onLinkClick}
        isProRole={effectiveProRole}
        mode={mode}
      />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, signOut, isPatient, isNutritionist, isPersonal, isAdmin, loading: authLoading } = useAuth();
  const { mode } = useExperienceMode();
  const isProRole = isNutritionist || isPersonal || isAdmin;

  const location = useLocation();
  console.log(`[DEBUG] DashboardLayout render | mode: ${mode} | path: ${location.pathname}`);
  const isMobile = useIsMobile();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;

    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSetCollapsed = useCallback((value: boolean) => {
    setCollapsed(value);

    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, value ? "1" : "0");
    } catch {
      // Ignore storage write failures and keep in-memory state.
    }
  }, []);

  // Mount realtime subscriptions and refetch-on-focus ONCE at layout level
  useRealtimeEventBus();
  usePatientRealtime();
  useNutritionistRealtime();
  useRefetchOnFocus();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  // Removed: no longer auto-close sidebar on route change
  // The user wants to close it only via the menu button

  const syncBrowserThemeChrome = useCallback((isDark: boolean) => {
    const themeColor = isDark ? "#000000" : "#f5f7fa";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    document.documentElement.style.backgroundColor = themeColor;
    document.body.style.backgroundColor = themeColor;

    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }

    meta.content = themeColor;
  }, []);

  useEffect(() => {
    syncBrowserThemeChrome(dark);
  }, [dark, syncBrowserThemeChrome]);

  const toggleDark = () => {
    const newDark = !dark;
    // Suppress all CSS transitions/animations during theme switch to prevent flashing
    const style = document.createElement("style");
    style.textContent = "*, *::before, *::after { transition: none !important; animation: none !important; }";
    document.documentElement.setAttribute("data-theme-switching", "true");
    document.head.appendChild(style);
    document.documentElement.classList.toggle("dark", newDark);
    syncBrowserThemeChrome(newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");
    setDark(newDark);
    // Re-enable after a frame so the browser paints the new theme first
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(() => {
          if (style.parentNode) {
            style.parentNode.removeChild(style);
          }
          document.documentElement.removeAttribute("data-theme-switching");
        }, 60);
      });
    });
  };

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const profileName = profile?.full_name || "Usuário";
  const sidebarProps = { dark, toggleDark, initials, profileName, signOut };
  const contentFallback = (
    <LayoutFallbackCard
      title="Esta página encontrou um erro"
      description="O restante do sistema continua estável. Você pode navegar para outra área enquanto este módulo é isolado."
    />
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">

        <div className="fixed top-0 left-0 right-0 z-50 h-16 bg-card border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[min(300px,88vw)] flex flex-col overflow-hidden !bg-card" aria-describedby={undefined}>
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <MobileSidebar
                  dark={dark}
                  toggleDark={toggleDark}
                  initials={initials}
                  profileName={profileName}
                  signOut={signOut}
                  onLinkClick={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <FitJourneyLogo collapsed={false} size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <BetaSwitcher />
            <SyncButton />

            <SystemHealthBadge />
            <TrialCountdown />
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}>
              <Search className="w-4 h-4" />
            </Button>
            <ErrorBoundary section="Layout:NotificationBell" fallback={null}>
              <NotificationBell />
            </ErrorBoundary>
          </div>
        </div>
        <main className="pt-16 pb-safe">
          <div className="p-3 sm:p-4 max-w-7xl mx-auto">
            <ErrorBoundary section={`PageContent:${location.pathname}`} fallback={contentFallback}>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    );

  }

  return (
    <div className="min-h-screen flex bg-background">

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.2 }}
        className={`fixed left-0 top-0 h-screen border-r transition-all duration-500 flex flex-col z-50 ${
          mode === 'advanced' ? 'border-amber-500/20 bg-card' :
          mode === 'pro' ? 'border-blue-500/20 bg-card' :
          'border-green-700/20 bg-card'
        }`}
      >
        <ErrorBoundary section="Layout:DesktopSidebar" fallback={<SidebarFallback />}>
          <DynamicSidebar {...sidebarProps} collapsed={collapsed} setCollapsed={handleSetCollapsed} />
        </ErrorBoundary>
      </motion.aside>

      <main className="flex-1 transition-all duration-200" style={{ marginLeft: collapsed ? 72 : 260 }}>
        <div className={`fixed top-0 right-0 z-40 p-3 transition-all duration-500 border-b backdrop-blur-md ${
          mode === 'advanced' ? 'border-amber-500/10 bg-background/80' :
          mode === 'pro' ? 'border-blue-500/10 bg-background/80' :
          'border-green-700/10 bg-background/80'
        }`} style={{ left: collapsed ? 72 : 260 }}>
          <div className="flex justify-end items-center gap-2">
            <SyncButton />
            <SystemHealthBadge />
            <TrialCountdown />
            <Button variant="ghost" size="icon" className="h-9 w-9 mr-1" onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))} title="Buscar (Ctrl+K)">
              <Search className="w-4 h-4" />
            </Button>
            <ErrorBoundary section="Layout:NotificationBell" fallback={null}>
              <NotificationBell />
            </ErrorBoundary>
          </div>
        </div>
        <div className="p-6 pt-14 max-w-7xl mx-auto">
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

