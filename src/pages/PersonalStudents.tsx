import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Users, Plus, Search, UserX, Dumbbell, TrendingUp, Sparkles, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LinkStudentModal from "@/components/professional/LinkStudentModal";
import AddStudentModal from "@/components/professional/AddStudentModal";
import { useProfessionalLinks } from "@/hooks/useProfessionalLinks";

export default function PersonalStudents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { links, loading, refetch, revokeLink } = useProfessionalLinks("trainer");
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  useEffect(() => {
    if (links.length > 0) {
      const ids = links.map((l) => l.patient_id);
      supabase
        .from("profiles")
        .select("*")
        .in("user_id", ids)
        .then(({ data }) => {
          const map: Record<string, any> = {};
          data?.forEach((p) => { map[p.user_id] = p; });
          setProfiles(map);
        });
    }
  }, [links]);

  const filtered = links.filter((l) => {
    if (!search) return true;
    const p = profiles[l.patient_id];
    return p?.full_name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/v1/personal/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Dumbbell className="w-6 h-6 text-primary" />
                Meus Alunos
              </h1>
              <p className="text-muted-foreground text-sm">
                {links.length} aluno{links.length !== 1 ? "s" : ""} vinculado{links.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setLinkOpen(true)} size="sm" variant="outline" className="gap-1.5">
              <Search className="w-4 h-4" />
              Vincular Aluno
            </Button>
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-primary/80">
              <Plus className="w-4 h-4" />
              Adicionar Aluno
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar aluno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid gap-3">
          {filtered.map((link) => {
            const p = profiles[link.patient_id];
            const initials = (p?.full_name || "?")
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <Card key={link.id} className="group hover:border-primary/20 transition-all">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="w-12 h-12 border-2 border-primary/10">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{p?.full_name || "Aluno"}</p>
                    <p className="text-xs text-muted-foreground">
                      Desde {new Date(link.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-primary/10 text-primary border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Ativo
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => revokeLink.mutate(link.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <UserX className="w-4 h-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {filtered.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum aluno vinculado ainda.</p>
              <p className="text-sm mt-1">Clique em "Vincular Aluno" para começar.</p>
            </div>
          )}
        </div>

        <LinkStudentModal
          open={linkOpen}
          onOpenChange={setLinkOpen}
          onLinked={() => refetch()}
          professionalRole="trainer"
        />

        <AddStudentModal
          open={addOpen}
          onOpenChange={setAddOpen}
          onAdded={() => refetch()}
        />
      </div>
    </DashboardLayout>
  );
}
