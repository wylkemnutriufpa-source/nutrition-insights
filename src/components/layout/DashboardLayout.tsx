import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Leaf, LogOut, Moon, Sun, ChevronRight, Settings, Menu } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSmartMenu } from "@/hooks/useSmartMenu";
import AccordionSidebar from "@/components/layout/AccordionSidebar";

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

  const isProRole = useMemo(() => isNutritionist || isPersonal || isAdmin, [isNutritionist, isPersonal, isAdmin]);

  return (
    <>
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

      <nav className="flex-1 px-3 mt-4 overflow-y-auto">
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
  const isTablet = !isMobile && typeof window !== "undefined" && window.innerWidth < 1024;
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [collapsed, setCollapsed] = useState(isTablet);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
