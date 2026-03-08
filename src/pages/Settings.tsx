import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Lock, Save } from "lucide-react";

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone || null })
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Perfil atualizado!");
      refreshProfile();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        <div>
          <h1 className="font-display text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground text-sm">Gerencie seu perfil e segurança</p>
        </div>

        {/* Profile */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Nome completo</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <Button type="submit" className="gradient-primary gap-2" disabled={savingProfile}>
                <Save className="w-4 h-4" />
                {savingProfile ? "Salvando..." : "Salvar Perfil"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <Label>Nova senha</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <Label>Confirmar nova senha</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                />
              </div>
              <Button type="submit" variant="outline" className="gap-2" disabled={changingPassword}>
                <Lock className="w-4 h-4" />
                {changingPassword ? "Alterando..." : "Alterar Senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}
