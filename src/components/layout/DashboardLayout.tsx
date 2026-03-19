import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, Moon, Sun, ChevronRight, Settings, Menu, ClipboardCheck, Brain } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { useSmartMenu } from "@/hooks/useSmartMenu";
import AccordionSidebar from "@/components/layout/AccordionSidebar";
import PendingApprovalsModal, { usePendingApprovals } from "@/components/patient/PendingApprovalsModal";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";
import SmartResumeModal from "@/components/common/SmartResumeModal";
...
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
