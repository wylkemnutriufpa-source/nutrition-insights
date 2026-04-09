import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, User, Mail, Phone, Calendar, ArrowRight } from "lucide-react";

interface Props {
  patientId: string;
  onNext: () => void;
}

export default function InOfficeStepPatient({ patientId, onNext }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, phone, date_of_birth, gender, avatar_url")
        .eq("user_id", patientId)
        .maybeSingle();
      setProfile(data);
      setLoading(false);
    })();
  }, [patientId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="w-4 h-4 text-primary" />
          Dados do Paciente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Nome</Label>
            <Input value={profile?.full_name || ""} readOnly className="bg-muted/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
            <Input value={profile?.email || ""} readOnly className="bg-muted/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</Label>
            <Input value={profile?.phone || "—"} readOnly className="bg-muted/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Data de Nascimento</Label>
            <Input value={profile?.date_of_birth || "—"} readOnly className="bg-muted/50" />
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-muted-foreground">
          ✅ Paciente já cadastrado no sistema. Prossiga para a anamnese.
        </div>

        <div className="flex justify-end">
          <Button onClick={onNext} className="gap-2">
            Iniciar Anamnese <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
