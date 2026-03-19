import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, Moon, Sun, ChevronRight, Settings, Menu, ClipboardCheck } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { useSmartMenu } from "@/hooks/useSmartMenu";
import AccordionSidebar from "@/components/layout/AccordionSidebar";
import PendingApprovalsModal, { usePendingApprovals } from "@/components/patient/PendingApprovalsModal";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import SmartResumeModal from "@/components/common/SmartResumeModal";

function SidebarFooter({
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
  return (
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
  const { isNutritionist, isPersonal, isAdmin } = useAuth();
  const pendingCount = usePendingApprovals();
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [smartResumeOpen, setSmartResumeOpen] = useState(false);

  const isProRole = useMemo(() => isNutritionist || isPersonal || isAdmin, [isNutritionist, isPersonal, isAdmin]);
  const showPending = isProRole && pendingCount > 0;

  return (
    <>
      <div className="p-4 flex items-center">
        <FitJourneyLogo collapsed={collapsed} size="sm" />
      </div>

      <div className="px-3 mb-1">
        <button
          onClick={() => setSmartResumeOpen(true)}
          className={`flex items-center gap-2 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all px-3 py-2.5 group ${collapsed ? "justify-center" : ""}`}
        >
          <div className="relative flex-shrink-0">
            <motion.div
              className="absolute -inset-1.5 rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(150 80% 50% / 0.3), transparent 70%)",
              }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              className="text-lg leading-none select-none relative z-10"
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 0 6px hsl(150 80% 50% / 0.5))" }}
            >
              🧠
            </motion.span>
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: "1px solid hsl(150 70% 50% / 0.4)" }}
              animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
          </div>
          {!collapsed && (
            <span className="text-xs font-semibold text-emerald-500 truncate group-hover:text-emerald-400 transition-colors">
              Inteligência FitJourney
            </span>
          )}
        </button>
      </div>

      <SmartResumeModal externalOpen={smartResumeOpen} onExternalOpenChange={setSmartResumeOpen} />

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

      <PendingApprovalsModal open={approvalsOpen} onOpenChange={setApprovalsOpen} />

      <nav className="flex-1 px-3 overflow-y-auto">
        <AccordionSidebar
          categories={categories}
          flatItems={flatItems}
          collapsed={collapsed}
          isProRole={isProRole}
          onLinkClick={onLinkClick}
          trackClick={trackClick}
        />
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
      />
    </>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [collapsed, setCollapsed] = useState(() => isTablet);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    setCollapsed(isTablet);
  }, [isTablet]);

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
  const sidebarProps = { dark, toggleDark, initials, profileName, signOut };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[min(280px,85vw)] flex flex-col">
                <DynamicSidebar {...sidebarProps} collapsed={false} onLinkClick={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <FitJourneyLogo collapsed={false} size="sm" />
          </div>
          <NotificationBell />
        </div>
        <main className="pt-14 pb-safe">
          <div className="p-3 sm:p-4 max-w-7xl mx-auto">{children}</div>
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
        className="fixed left-0 top-0 h-screen border-r border-border bg-card flex flex-col z-50"
      >
        <DynamicSidebar {...sidebarProps} collapsed={collapsed} setCollapsed={setCollapsed} />
      </motion.aside>

      <main className="flex-1 transition-all duration-200" style={{ marginLeft: collapsed ? 72 : 260 }}>
        <div className="fixed top-0 right-0 z-40 p-3 transition-[left] duration-200" style={{ left: collapsed ? 72 : 260 }}>
          <div className="flex justify-end">
            <NotificationBell />
          </div>
        </div>
        <div className="p-6 pt-14 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
