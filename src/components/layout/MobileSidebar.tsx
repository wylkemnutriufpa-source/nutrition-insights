import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LogOut, Moon, Sun, Settings, ChevronDown, LayoutDashboard,
  Dumbbell, Lock, Rocket, Activity, Shield, Brain, X,
} from "lucide-react";
import { useSmartMenu } from "@/hooks/useSmartMenu";
import { useProfessionalModules } from "@/hooks/useProfessionalModules";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import WorkspaceContextSwitcher from "@/components/layout/WorkspaceContextSwitcher";
import AccordionSidebar from "@/components/layout/AccordionSidebar";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import PendingApprovalsModal, { usePendingApprovals } from "@/components/patient/PendingApprovalsModal";

/* ── Module definitions ── */
interface ModuleDef {
  id: string;
  label: string;
  route: string;
  icon: any;
  colorClass: string;
  bgClass: string;
  show: boolean;
  locked?: boolean;
}

/* ── Section divider ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-4 pb-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        {children}
      </span>
    </div>
  );
}

/* ── Props ── */
interface MobileSidebarProps {
  dark: boolean;
  toggleDark: () => void;
  initials: string;
  profileName: string;
  signOut: () => void;
  onLinkClick: () => void;
}

export default function MobileSidebar({
  dark,
  toggleDark,
  initials,
  profileName,
  signOut,
  onLinkClick,
}: MobileSidebarProps) {
  const { isNutritionist, isPersonal, isAdmin } = useAuth();
  const { mode, isFeatureEnabled } = useExperienceMode();
  const { isProfessionalContext } = useWorkspaceContext();
  const { categories, flatItems, trackClick } = useSmartMenu();
  const { coachBodybuilderEnabled, personalTrainerEnabled } = useProfessionalModules();
  const pendingCount = usePendingApprovals();
  const location = useLocation();

  const isProRole = isNutritionist || isPersonal || isAdmin;
  const effectiveProRole = isProRole && isProfessionalContext;

  const [modulesExpanded, setModulesExpanded] = useState(false);
  const [approvalsOpen, setApprovalsOpen] = useState(false);

  /* ── Build module list ── */
  const modules: ModuleDef[] = useMemo(() => {
    if (!effectiveProRole) return [];
    return [
      {
        id: "intelligence",
        label: "Inteligência FitJourney",
        route: "/intelligence-settings",
        icon: Brain,
        colorClass: "text-amber-500",
        bgClass: "bg-amber-500/10",
        show: true,
      },
      {
        id: "control-tower",
        label: "Control Tower",
        route: "/control-tower",
        icon: Activity,
        colorClass: "text-violet-500",
        bgClass: "bg-violet-500/10",
        show: true,
      },
      {
        id: "cockpit",
        label: "Cockpit Premium",
        route: "/cockpit",
        icon: Rocket,
        colorClass: "text-amber-500",
        bgClass: "bg-amber-500/10",
        show: isNutritionist || isAdmin,
      },
      {
        id: "clinical-workspace",
        label: "Workspace Clínico",
        route: "/clinical-workspace",
        icon: LayoutDashboard,
        colorClass: "text-sky-500",
        bgClass: "bg-sky-500/10",
        show: isNutritionist || isAdmin,
      },
      {
        id: "coach",
        label: "Coach Bodybuilder",
        route: "/coach-bodybuilder",
        icon: Activity,
        colorClass: "text-orange-500",
        bgClass: "bg-orange-500/10",
        show: isNutritionist || isAdmin,
        locked: !coachBodybuilderEnabled,
      },
      {
        id: "personal",
        label: "Personal Trainer",
        route: "/personal/dashboard",
        icon: Dumbbell,
        colorClass: "text-emerald-500",
        bgClass: "bg-emerald-500/10",
        show: isPersonal || isAdmin,
        locked: !personalTrainerEnabled,
      },
      {
        id: "diagnostics",
        label: "System Diagnostics",
        route: "/admin/diagnostics",
        icon: Shield,
        colorClass: "text-cyan-500",
        bgClass: "bg-cyan-500/10",
        show: isAdmin,
      },
    ].filter((m) => m.show);
  }, [effectiveProRole, isNutritionist, isAdmin, isPersonal, coachBodybuilderEnabled, personalTrainerEnabled]);

  const activeModule = modules.find((m) => location.pathname.startsWith(m.route));

  /* ── Patient-specific links ── */
  const patientLinks = !effectiveProRole
    ? [
        { label: "Inteligência FitJourney", route: "/patient-intelligence", icon: Brain, colorClass: "text-amber-500", feature: "ai-insights" },
        { label: "Onboarding", route: "/onboarding", icon: Rocket, colorClass: "text-primary", feature: "anamnesis" },
        { label: "Meu Painel", route: "/patient-overview", icon: Activity, colorClass: "text-violet-500", feature: "journey" },
      ].filter(l => isFeatureEnabled(l.feature) && (mode !== 'basic' || l.feature === 'anamnesis'))
    : [];

  return (
    <div className={`flex h-full flex-col transition-colors duration-500 ${
      mode === 'advanced' ? 'bg-card/95 backdrop-blur-xl' :
      mode === 'pro' ? 'bg-blue-500/5' :
      'bg-green-700/5'
    }`}>
      {/* ═══════════ 1. HEADER ═══════════ */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border flex-shrink-0">
        <FitJourneyLogo collapsed={false} size="sm" />
      </div>

      {/* ═══════════ SCROLLABLE CONTENT ═══════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {/* ── Workspace switcher (hybrid users) ── */}
        <div className="px-1 pt-3">
          <WorkspaceContextSwitcher collapsed={false} />
        </div>

        {/* ═══════════ 2. MODULES (pro only) ═══════════ */}
        {effectiveProRole && modules.length > 0 && (
          <>
            <SectionLabel>Módulo ativo</SectionLabel>
            <div className="px-3">
              {/* Active module display + toggle */}
              <button
                onClick={() => setModulesExpanded((v) => !v)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border transition-all ${
                  mode === 'advanced' ? 'bg-amber-500/10 border-amber-500/20' :
                  mode === 'pro' ? 'bg-blue-500/10 border-blue-500/20' :
                  'bg-primary/8 border-primary/20'
                }`}
              >
                {activeModule ? (
                  <>
                    <activeModule.icon className={`w-4 h-4 ${activeModule.colorClass} flex-shrink-0`} />
                    <span className={`text-xs font-semibold ${activeModule.colorClass} flex-1 text-left truncate`}>
                      {activeModule.label}
                    </span>
                  </>
                ) : (
                  <>
                    <LayoutDashboard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs font-semibold text-muted-foreground flex-1 text-left">
                      Selecionar módulo
                    </span>
                  </>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                    modulesExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Expandable module list */}
              <AnimatePresence initial={false}>
                {modulesExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1.5 space-y-0.5">
                      {modules.map((mod) => {
                        const isActive = location.pathname.startsWith(mod.route);
                        const Icon = mod.icon;

                        if (mod.locked) {
                          return (
                            <div
                              key={mod.id}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground/40 cursor-not-allowed"
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-xs truncate flex-1">{mod.label}</span>
                              <Lock className="w-3 h-3" />
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={mod.id}
                            to={mod.route}
                            onClick={() => {
                              setModulesExpanded(false);
                              onLinkClick();
                            }}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                              isActive
                                ? `${mod.bgClass} ${mod.colorClass} font-semibold`
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            }`}
                          >
                            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? mod.colorClass : ""}`} />
                            <span className="text-xs truncate flex-1">{mod.label}</span>
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* ═══════════ PATIENT QUICK LINKS ═══════════ */}
        {!effectiveProRole && patientLinks.length > 0 && (
          <>
            <SectionLabel>Acesso rápido</SectionLabel>
            <div className="px-3 space-y-0.5">
              {patientLinks.map((link) => {
                const isActive = location.pathname === link.route;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.route}
                    to={link.route}
                    onClick={onLinkClick}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? `bg-primary/10 ${link.colorClass} font-semibold`
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? link.colorClass : ""}`} />
                    <span className="text-xs truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* ═══════════ PENDING APPROVALS ═══════════ */}
        {effectiveProRole && pendingCount > 0 && (
          <div className="px-3 mt-2">
            <button
              onClick={() => setApprovalsOpen(true)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/8 hover:bg-amber-500/15 transition-all"
            >
              <span className="relative flex-shrink-0">
                <Activity className="w-4 h-4 text-amber-500" />
                <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              </span>
              <span className="text-xs font-semibold text-amber-500">Planos Pendentes</span>
            </button>
          </div>
        )}

        {/* ═══════════ 3. NAVIGATION ═══════════ */}
        <SectionLabel>Navegação</SectionLabel>
        <div className="px-3">
          <ErrorBoundary section="MobileSidebar:Nav" fallback={null}>
            <AccordionSidebar
              categories={categories}
              flatItems={flatItems}
              collapsed={false}
              isProRole={effectiveProRole}
              onLinkClick={onLinkClick}
              trackClick={trackClick}
            />
          </ErrorBoundary>
        </div>

        {/* ═══════════ 4. UTILITIES ═══════════ */}
        <SectionLabel>Configurações</SectionLabel>
        <div className="px-3 space-y-0.5 pb-4">
          {effectiveProRole && (
            <Link
              to="/workspace"
              onClick={onLinkClick}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-xs">Editor Workspace</span>
            </Link>
          )}
          <Link
            to="/settings"
            onClick={onLinkClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <Settings className="w-4 h-4" />
            <span className="text-xs">Configurações</span>
          </Link>
          <button
            onClick={toggleDark}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all w-full"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-xs">{dark ? "Modo claro" : "Modo escuro"}</span>
          </button>
        </div>
      </div>

      {/* ═══════════ 5. FOOTER ═══════════ */}
      <div className="flex-shrink-0 border-t border-border px-4 py-3 flex items-center gap-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{profileName}</p>
        </div>
        <button
          onClick={() => {
            signOut();
            onLinkClick();
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all flex-shrink-0"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Modals */}
      <ErrorBoundary section="MobileSidebar:Approvals" fallback={null}>
        <PendingApprovalsModal open={approvalsOpen} onOpenChange={setApprovalsOpen} />
      </ErrorBoundary>
    </div>
  );
}
