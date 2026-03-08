import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Users, UtensilsCrossed, Trophy, Target,
  Leaf, LogOut, Moon, Sun, ChevronRight, Sparkles, Settings
} from "lucide-react";
import { useState } from "react";

const nutritionistLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/patients", icon: Users, label: "Pacientes" },
  { to: "/meal-plans", icon: UtensilsCrossed, label: "Planos" },
];

const patientLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/meals", icon: UtensilsCrossed, label: "Refeições" },
  { to: "/achievements", icon: Trophy, label: "Conquistas" },
  { to: "/challenges", icon: Target, label: "Desafios" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, isNutritionist, signOut } = useAuth();
  const location = useLocation();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [collapsed, setCollapsed] = useState(false);

  const links = isNutritionist ? nutritionistLinks : patientLinks;

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDark(!dark);
  };

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.2 }}
        className="fixed left-0 top-0 h-screen border-r border-border bg-card flex flex-col z-50"
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow">
            <Leaf className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-display font-bold text-lg"
            >
              Nutri<span className="text-primary">Flow</span>
            </motion.span>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 mt-4 space-y-1">
          {links.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <link.icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-primary" : ""}`} />
                {!collapsed && (
                  <span className="text-sm font-medium">{link.label}</span>
                )}
                {active && !collapsed && (
                  <ChevronRight className="w-4 h-4 ml-auto text-primary" />
                )}
              </Link>
            );
          })}

          {!isNutritionist && (
            <Link
              to="/analyze"
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
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name || "Usuário"}</p>
              </div>
            )}
          </div>

          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-all"
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="text-sm">Sair</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main
        className="flex-1 transition-all duration-200"
        style={{ marginLeft: collapsed ? 72 : 260 }}
      >
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
