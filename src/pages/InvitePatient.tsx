import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, UserPlus, Mail, Key, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import SubscriptionGuard from "@/components/common/SubscriptionGuard";

export default function InvitePatient() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState<"magic_link" | "password">("magic_link");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    setTempPassword("Fit@2026!");
  };

  const handleInvite = async () => {
    if (!name || !email || !user?.id) {
      toast.error("Preencha nome e email do paciente");
      return;
    }

    if (method === "password" && !tempPassword) {
      toast.error("Gere uma senha temporária");
      return;
    }

    setLoading(true);
    try {
      // Use edge function to create patient without breaking current session
      const { data, error } = await supabase.functions.invoke("invite-patient", {
        body: {
          name,
          email,
          phone: phone || null,
          method,
          password: method === "password" ? tempPassword : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCreated(true);
      toast.success("Paciente convidado com sucesso!");
    } catch (err: any) {
      console.error("Invite error:", err);
      toast.error(err.message || "Erro ao convidar paciente");
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    navigator.clipboard.writeText(`Email: ${email}\nSenha: ${tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SubscriptionGuard featureName="Convite de Pacientes">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/patients">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-display font-bold">Convidar Paciente</h1>
            <p className="text-xs text-muted-foreground">Cadastre e envie acesso ao seu paciente</p>
          </div>
        </div>

        {!created ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do Paciente</CardTitle>
              <CardDescription>O paciente receberá acesso controlado à plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do paciente" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="paciente@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Telefone (opcional)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>

              <div className="space-y-3 pt-2">
                <Label>Método de acesso</Label>
                <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)} className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-all">
                    <RadioGroupItem value="magic_link" id="magic_link" />
                    <Label htmlFor="magic_link" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Link por email</p>
                          <p className="text-xs text-muted-foreground">Paciente recebe link para definir senha</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-all">
                    <RadioGroupItem value="password" id="password" />
                    <Label htmlFor="password" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="text-sm font-medium">Senha temporária</p>
                          <p className="text-xs text-muted-foreground">Você compartilha as credenciais</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {method === "password" && (
                <div className="space-y-2">
                  <Label>Senha temporária</Label>
                  <div className="flex gap-2">
                    <Input value={tempPassword} readOnly placeholder="Clique em gerar" className="font-mono" />
                    <Button variant="outline" size="sm" onClick={generatePassword}>Gerar</Button>
                  </div>
                </div>
              )}

              <Button onClick={handleInvite} disabled={loading} className="w-full gap-2">
                <UserPlus className="w-4 h-4" />
                {loading ? "Cadastrando..." : "Convidar Paciente"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="py-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold">Paciente Convidado!</h3>
                <p className="text-sm text-muted-foreground mt-1">{name} foi cadastrado(a) com sucesso.</p>
              </div>

              {method === "magic_link" && (
                <p className="text-sm text-muted-foreground">
                  Um email foi enviado para <strong>{email}</strong> com link para definir a senha.
                </p>
              )}

              {method === "password" && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Compartilhe as credenciais:</p>
                  <div className="bg-card border border-border rounded-lg p-3 text-left font-mono text-sm">
                    <p>Email: {email}</p>
                    <p>Senha: {tempPassword}</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={copyCredentials}>
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copiado!" : "Copiar credenciais"}
                  </Button>
                </div>
              )}

              <div className="flex gap-2 justify-center pt-2">
                <Button variant="outline" onClick={() => { setCreated(false); setName(""); setEmail(""); setPhone(""); setTempPassword(""); }}>
                  Convidar outro
                </Button>
                <Button onClick={() => navigate("/patients")}>
                  Ver pacientes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SubscriptionGuard>
  );
}
