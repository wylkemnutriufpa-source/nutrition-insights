import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageCircle, Send, Image as ImageIcon } from "lucide-react";

interface Props {
  students: { student_id: string; full_name: string }[];
}

export default function PTStudentChat({ students }: Props) {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user || students.length === 0) return;
    loadUnreadCounts();
  }, [user, students]);

  useEffect(() => {
    if (!selectedStudent || !user) return;
    loadMessages();
    markAsRead();

    const channel = supabase
      .channel(`pt-chat-${selectedStudent}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `sender_id=eq.${selectedStudent}`,
      }, (payload) => {
        if (payload.new.receiver_id === user.id) {
          setMessages(prev => [...prev, payload.new]);
          markAsRead();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedStudent, user]);

  const loadUnreadCounts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chat_messages")
      .select("sender_id")
      .eq("receiver_id", user.id)
      .eq("is_read", false)
      .in("sender_id", students.map(s => s.student_id));

    const counts: Record<string, number> = {};
    (data || []).forEach(m => {
      counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
    });
    setUnreadCounts(counts);
  };

  const loadMessages = async () => {
    if (!user || !selectedStudent) return;
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedStudent}),and(sender_id.eq.${selectedStudent},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true })
      .limit(100);

    setMessages(data || []);
  };

  const markAsRead = async () => {
    if (!user || !selectedStudent) return;
    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("sender_id", selectedStudent)
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    setUnreadCounts(prev => ({ ...prev, [selectedStudent]: 0 }));
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedStudent) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      sender_id: user.id,
      receiver_id: selectedStudent,
      message: newMessage.trim(),
    } as any);
    if (error) {
      toast.error("Erro ao enviar mensagem");
    } else {
      setMessages(prev => [...prev, {
        sender_id: user.id,
        receiver_id: selectedStudent,
        message: newMessage.trim(),
        created_at: new Date().toISOString(),
        is_read: false,
      }]);
      setNewMessage("");
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Chat com Alunos</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Student list */}
        <Card className="md:col-span-1">
          <CardContent className="p-2">
            <div className="space-y-1">
              {students.map(s => (
                <button
                  key={s.student_id}
                  onClick={() => setSelectedStudent(s.student_id)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm transition-all text-left
                    ${selectedStudent === s.student_id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {s.full_name.charAt(0)}
                  </div>
                  <span className="flex-1 truncate font-medium">{s.full_name}</span>
                  {(unreadCounts[s.student_id] || 0) > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{unreadCounts[s.student_id]}</Badge>
                  )}
                </button>
              ))}
              {students.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum aluno vinculado</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chat area */}
        <Card className="md:col-span-2">
          <CardContent className="p-0 flex flex-col h-[400px]">
            {selectedStudent ? (
              <>
                <div className="p-3 border-b border-border">
                  <span className="font-semibold text-sm">
                    {students.find(s => s.student_id === selectedStudent)?.full_name}
                  </span>
                </div>

                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-2">
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                          msg.sender_id === user?.id
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        }`}>
                          <p>{msg.message}</p>
                          <p className={`text-[10px] mt-1 ${msg.sender_id === user?.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">Nenhuma mensagem ainda</p>
                    )}
                  </div>
                </ScrollArea>

                <div className="p-3 border-t border-border flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    className="h-9"
                  />
                  <Button size="sm" onClick={sendMessage} disabled={!newMessage.trim() || sending} className="gap-1">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Selecione um aluno para conversar</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
