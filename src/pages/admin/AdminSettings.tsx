import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, Shield, Activity, Cpu, Sparkles, Database, GitBranch, BarChart3, Users, Bell } from "lucide-react";

const SECTIONS = [
  { to: "/admin/feature-control", title: "Controle de Features", desc: "Flags e módulos premium", icon: Sparkles },
  { to: "/admin/ai-settings", title: "IA & Uso", desc: "Custos e flag global de IA generativa", icon: Cpu },
  { to: "/admin/security", title: "Segurança", desc: "Auditoria e baseline de segurança", icon: Shield },
  { to: "/admin/health", title: "Saúde do Sistema", desc: "Status em tempo real", icon: Activity },
  { to: "/admin/menu-config", title: "Configuração de Menus", desc: "Itens da sidebar e visibilidade", icon: Settings2 },
  { to: "/admin/patient-features", title: "Features do Paciente", desc: "Liberar/bloquear módulos por paciente", icon: Users },
  { to: "/admin/migrations", title: "Schema & Migrations", desc: "Monitor de schema do banco", icon: Database },
  { to: "/admin/experimental", title: "Experimental", desc: "Features em validação", icon: GitBranch },
  { to: "/admin/performance", title: "Performance", desc: "Dashboard operacional", icon: BarChart3 },
  { to: "/admin/marketing", title: "Marketing", desc: "Conteúdo e campanhas", icon: Bell },
];

export default function AdminSettings() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Hub central de configurações administrativas.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map(({ to, title, desc, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="hover:border-primary/50 transition-colors h-full">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <Icon className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-base">{title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{desc}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
