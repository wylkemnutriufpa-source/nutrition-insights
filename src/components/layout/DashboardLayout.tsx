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
  { to: "/settings", icon: Settings, label: "Ajustes" },
];

const patientLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/meals", icon: UtensilsCrossed, label: "Refeições" },
  { to: "/achievements", icon: Trophy, label: "Conquistas" },
  { to: "/challenges", icon: Target, label: "Desafios" },
  { to: "/settings", icon: Settings, label: "Ajustes" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, isNutritionist, signOut } = useAuth();
  const location = useLocation();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  const links = isNutritionist ? nutritionistLinks : patientLinks;

  const toggleDark = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    setDark(isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
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
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-primary">
            <Leaf className="w-6 h-6" />
            FitJourney
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={toggleDark}
          >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {dark ? "Modo Claro" : "Modo Escuro"}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={signOut}
          >
            <LogOut className="w-5 h-5" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{profile?.full_name || "Bem-vindo"}</p>
              <p className="text-xs text-muted-foreground">
                {isNutritionist ? "Nutricionista" : "Paciente"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Pro Plan
            </Button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
