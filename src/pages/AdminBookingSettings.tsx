import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarDays, DollarSign, Globe, Loader2, Save, ExternalLink, CreditCard, Users
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BookingProfile {
  id: string;
  nutritionist_id: string;
  slug: string;
  is_public: boolean;
  booking_enabled: boolean;
  booking_price: number;
  booking_payment_required: boolean;
  nutri_name?: string;
}

export default function AdminBookingSettings() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<BookingProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    const { data } = await supabase
      .from("public_profile_settings")
      .select("id, nutritionist_id, slug, is_public, booking_enabled, booking_price, booking_payment_required");

    if (data) {
      // Fetch names
      const withNames = await Promise.all(
        data.map(async (p: any) => {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", p.nutritionist_id)
            .maybeSingle();
          return { ...p, nutri_name: prof?.full_name || "Nutricionista" };
        })
      );
      setProfiles(withNames);
    }
    setLoading(false);
  }

  async function updateProfile(id: string, updates: Partial<BookingProfile>) {
    const { error } = await supabase
      .from("public_profile_settings")
      .update(updates)
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Configuração salva!");
    loadProfiles();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-bold">Agenda Pública — Configurações</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie agendas públicas, pagamento antecipado e disponibilidade de profissionais
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : profiles.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum profissional configurou perfil público ainda.</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4">
              {profiles.map((p) => (
                <Card key={p.id} className="glass shadow-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" />
                        {p.nutri_name}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={p.is_public ? "default" : "secondary"} className="text-xs">
                          {p.is_public ? "Público" : "Privado"}
                        </Badge>
                        <Badge variant={p.booking_enabled ? "default" : "outline"} className="text-xs">
                          {p.booking_enabled ? "Agenda Ativa" : "Agenda Inativa"}
                        </Badge>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => window.open(`/p/${p.slug}/agendar`, "_blank")}
                          className="gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Ver
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Slug</Label>
                        <p className="text-sm font-mono">/p/{p.slug}/agendar</p>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs">Pagamento antecipado</Label>
                        <Switch
                          checked={p.booking_payment_required}
                          onCheckedChange={(val) =>
                            updateProfile(p.id, { booking_payment_required: val } as any)
                          }
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Valor da consulta (R$)</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            defaultValue={p.booking_price}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              if (val !== p.booking_price) {
                                updateProfile(p.id, { booking_price: val } as any);
                              }
                            }}
                            className="w-28"
                          />
                          <CreditCard className="w-4 h-4 text-muted-foreground self-center" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </DashboardLayout>
  );
}
