import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@v1/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@v1/components/ui/button";
import { Card, CardContent } from "@v1/components/ui/card";
import { Input } from "@v1/components/ui/input";
import { Textarea } from "@v1/components/ui/textarea";
import { Badge } from "@v1/components/ui/badge";
import { toast } from "sonner";
import {
  Calendar as CalIcon, Clock, User, Loader2, Send,
  CheckCircle2, ChevronLeft, ChevronRight, Video, MapPin, CreditCard, Lock
} from "lucide-react";
import { format, addDays, isSameDay, startOfWeek, addWeeks, isAfter, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimeSlot {
  time: string;
  available: boolean;
}

const DEFAULT_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"
];

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [bookingPrice, setBookingPrice] = useState<number>(0);
  const [paymentRequired, setPaymentRequired] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: pub } = await supabase
        .from("public_profile_settings")
        .select("*")
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle();

      if (!pub) { setNotFound(true); setLoading(false); return; }
      setProfile(pub);
      setBookingPrice(Number(pub.booking_price) || 0);
      setPaymentRequired(pub.booking_payment_required === true);

      const { data: pData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", pub.nutritionist_id)
        .maybeSingle();

      setProfileData(pData);
      setLoading(false);
    })();
  }, [slug]);

  // Fetch existing appointments for the week
  useEffect(() => {
    if (!profile) return;
    const from = weekStart.toISOString();
    const to = addDays(weekStart, 7).toISOString();
    supabase
      .from("patient_appointments")
      .select("appointment_date, duration_minutes")
      .eq("nutritionist_id", profile.nutritionist_id)
      .gte("appointment_date", from)
      .lt("appointment_date", to)
      .neq("status", "cancelled")
      .then(({ data }) => setExistingAppointments(data || []));
  }, [profile, weekStart]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)); // Mon-Sat
  }, [weekStart]);

  const getSlotsForDate = (date: Date): TimeSlot[] => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return DEFAULT_SLOTS.map(t => ({ time: t, available: false }));

    const bookedTimes = existingAppointments
      .filter(a => isSameDay(new Date(a.appointment_date), date))
      .map(a => format(new Date(a.appointment_date), "HH:mm"));

    return DEFAULT_SLOTS.map(time => ({
      time,
      available: !bookedTimes.includes(time),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedDate || !selectedSlot || !form.name.trim() || !form.email.trim()) return;
    setSubmitting(true);

    const appointmentDate = new Date(selectedDate);
    const [h, m] = selectedSlot.split(":").map(Number);
    appointmentDate.setHours(h, m, 0, 0);

    // Create lead request with booking info
    const { error } = await supabase.from("lead_requests").insert({
      nutritionist_id: profile.nutritionist_id,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      message: `📅 Agendamento: ${format(appointmentDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}${form.message ? `\n\n${form.message.trim()}` : ""}`,
      source: "booking",
    });

    if (error) { setSubmitting(false); toast.error("Erro ao enviar. Tente novamente."); return; }

    // If payment required, redirect to Stripe checkout
    if (paymentRequired && bookingPrice > 0) {
      try {
        const { data, error: payError } = await supabase.functions.invoke("create-booking-payment", {
          body: {
            nutritionist_id: profile.nutritionist_id,
            amount: bookingPrice,
            customer_name: form.name.trim(),
            customer_email: form.email.trim(),
            slot_date: format(selectedDate, "dd/MM/yyyy"),
            slot_time: selectedSlot,
          },
        });
        if (payError) throw payError;
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
      } catch (payErr: any) {
        console.error("Payment error:", payErr);
        toast.error("Erro ao processar pagamento. Seu agendamento foi registrado sem pagamento.");
      }
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (notFound || !profile) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Agenda não encontrada</h1>
        <p className="text-muted-foreground">Este profissional não possui uma agenda pública.</p>
      </div>
    </div>
  );

  const name = profileData?.full_name || "Nutricionista";

  if (submitted) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Helmet>
        <title>Agendamento Confirmado — {name}</title>
      </Helmet>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Solicitação Enviada!</h1>
        <p className="text-muted-foreground mb-2">
          Sua solicitação de agendamento foi enviada para <strong>{name}</strong>.
        </p>
        <p className="text-sm text-muted-foreground">
          Você receberá uma confirmação por e-mail assim que o profissional aprovar.
        </p>
        <Badge variant="secondary" className="mt-4 text-sm py-1 px-3">
          {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedSlot}
        </Badge>
      </motion.div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Agendar com {name} | FitJourney</title>
        <meta name="description" content={`Agende sua consulta com ${name} de forma rápida e fácil.`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary/15 via-background to-accent/10 py-10 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 border-2 border-primary/30">
              {profileData?.avatar_url ? (
                <img src={profileData.avatar_url} alt={name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-primary" />
              )}
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-1">Agende com {name}</h1>
            <p className="text-muted-foreground text-sm">Escolha o melhor horário para sua consulta</p>
          </motion.div>
        </div>

        {/* Calendar + Slots */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                  <CalIcon className="w-5 h-5 text-primary" />
                  {format(weekStart, "MMMM yyyy", { locale: ptBR })}
                </h2>
                <div className="flex gap-1">
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => setWeekStart(addWeeks(weekStart, -1))}
                    disabled={isBefore(addWeeks(weekStart, -1), startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
                {weekDays.map((day) => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isPast = isBefore(day, startOfDay(new Date()));
                  const isToday = isSameDay(day, new Date());
                  const slots = getSlotsForDate(day);
                  const availableCount = slots.filter(s => s.available).length;

                  return (
                    <button
                      key={day.toISOString()}
                      disabled={isPast || availableCount === 0}
                      onClick={() => { setSelectedDate(day); setSelectedSlot(null); }}
                      className={`p-3 rounded-xl text-center transition-all border ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                          : isPast || availableCount === 0
                          ? "border-border opacity-40 cursor-not-allowed"
                          : "border-border hover:border-primary/30 cursor-pointer"
                      }`}
                    >
                      <p className="text-xs text-muted-foreground uppercase">
                        {format(day, "EEE", { locale: ptBR })}
                      </p>
                      <p className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>
                        {format(day, "dd")}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {availableCount > 0 ? `${availableCount} vagas` : "Lotado"}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Horários para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {getSlotsForDate(selectedDate).map((slot) => (
                      <button
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot.time)}
                        className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border ${
                          selectedSlot === slot.time
                            ? "bg-primary text-primary-foreground border-primary"
                            : slot.available
                            ? "border-border hover:border-primary/50 hover:bg-primary/5"
                            : "border-border opacity-30 cursor-not-allowed line-through"
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Booking Form */}
            <div>
              <Card className="sticky top-4">
                <CardContent className="p-5">
                  <h3 className="font-display font-semibold mb-1">Seus Dados</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Preencha para solicitar o agendamento
                  </p>

                  {selectedDate && selectedSlot && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 mb-4">
                      <CalIcon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">
                        {format(selectedDate, "dd/MM", { locale: ptBR })} às {selectedSlot}
                      </span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <Input
                      placeholder="Seu nome *"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      required maxLength={200}
                    />
                    <Input
                      type="email"
                      placeholder="Seu e-mail *"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      required maxLength={320}
                    />
                    <Input
                      placeholder="Telefone (opcional)"
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      maxLength={20}
                    />
                    <Textarea
                      placeholder="Observações (opcional)"
                      value={form.message}
                      onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      rows={2} maxLength={2000}
                    />

                    {paymentRequired && bookingPrice > 0 && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                        <CreditCard className="w-4 h-4 text-accent shrink-0" />
                        <div className="text-xs">
                          <span className="font-medium">Pagamento antecipado: </span>
                          <span className="text-primary font-bold">R$ {bookingPrice.toFixed(2).replace(".", ",")}</span>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full gradient-primary shadow-glow gap-2"
                      disabled={!selectedDate || !selectedSlot || submitting}
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : paymentRequired && bookingPrice > 0 ? (
                        <CreditCard className="w-4 h-4" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {paymentRequired && bookingPrice > 0
                        ? `Pagar e Agendar — R$ ${bookingPrice.toFixed(2).replace(".", ",")}`
                        : "Solicitar Agendamento"}
                    </Button>
                  </form>

                  <p className="text-[10px] text-muted-foreground mt-3 text-center">
                    Ao solicitar, você concorda com os termos de uso.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6 text-xs text-muted-foreground">
          Powered by <span className="text-primary font-semibold">FitJourney</span>
        </div>
      </div>
    </>
  );
}
