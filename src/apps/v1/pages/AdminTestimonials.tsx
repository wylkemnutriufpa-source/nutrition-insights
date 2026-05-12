import { useEffect, useState } from "react";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Badge } from "@v1/components/ui/badge";
import { toast } from "sonner";
import { Star, Check, X, Clock } from "lucide-react";

interface Testimonial {
  id: string;
  patient_id: string;
  content: string;
  rating: number;
  status: string;
  is_anonymous: boolean;
  created_at: string;
  patient_name?: string;
}

export default function AdminTestimonials() {
  const { user } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
      if (data) {
        const enriched = await Promise.all(
          data.map(async (t: any) => {
            const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", t.patient_id).maybeSingle();
            return { ...t, patient_name: t.is_anonymous ? "Anônimo" : (profile?.full_name || "Paciente") };
          })
        );
        setTestimonials(enriched);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("testimonials").update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setTestimonials(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    toast.success(status === "approved" ? "Depoimento aprovado!" : "Depoimento rejeitado");
  };

  const filtered = filter === "all" ? testimonials : testimonials.filter(t => t.status === filter);

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-success/10 text-success border-0">Aprovado</Badge>;
      case "rejected": return <Badge variant="destructive">Rejeitado</Badge>;
      default: return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Star className="w-8 h-8 text-accent" />
          <div>
            <h1 className="font-display text-2xl font-bold">Depoimentos</h1>
            <p className="text-muted-foreground text-sm">Moderação de depoimentos dos pacientes</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["all", "pending", "approved", "rejected"] as const).map(f => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm"
              onClick={() => setFilter(f)}>
              {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : f === "approved" ? "Aprovados" : "Rejeitados"}
              {f !== "all" && <span className="ml-1 text-xs">({testimonials.filter(t => t.status === f).length})</span>}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="glass shadow-card">
            <CardContent className="py-12 text-center">
              <Star className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum depoimento {filter !== "all" ? filter : ""}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map(t => (
              <Card key={t.id} className="glass shadow-card">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-sm">{t.patient_name}</p>
                        {statusBadge(t.status)}
                        <div className="flex items-center gap-0.5 ml-auto">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < t.rating ? "text-accent fill-accent" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{t.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">{new Date(t.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    {t.status === "pending" && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success/10"
                          onClick={() => updateStatus(t.id, "approved")}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => updateStatus(t.id, "rejected")}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
