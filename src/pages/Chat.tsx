import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, ArrowLeft, Check, CheckCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import NutritionistStatusIndicator from "@/components/chat/NutritionistStatusIndicator";
import QuickReplySuggestions from "@/components/chat/QuickReplySuggestions";
import { useChatContacts, useChatMessages, useSendMessage } from "@/hooks/queries";
import type { Message } from "@/hooks/queries/useChatQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/queryKeys";

export default function Chat() {
  const { user, isNutritionist, isPatient } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("with");
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading: contactsLoading } = useChatContacts();
  const { data: messages = [], isLoading: messagesLoading } = useChatMessages(selectedId);
  const sendMutation = useSendMessage();

  const selectedContact = contacts.find(c => c.user_id === selectedId);
  const selectedName = selectedContact?.full_name || "";

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("chat-realtime-" + user.id)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "chat_messages",
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === selectedId) {
          // Add to current messages cache
          queryClient.setQueryData<Message[]>(
            queryKeys.chat.messages(user.id, selectedId!),
            (old) => [...(old || []), msg]
          );
          supabase.from("chat_messages").update({ is_read: true }).eq("id", msg.id);
        }
        // Refresh contacts for unread count
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.contacts(user.id) });
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "chat_messages",
        filter: `sender_id=eq.${user.id}`,
      }, (payload) => {
        const updated = payload.new as Message;
        if (selectedId) {
          queryClient.setQueryData<Message[]>(
            queryKeys.chat.messages(user.id, selectedId),
            (old) => (old || []).map(m => m.id === updated.id ? { ...m, is_read: updated.is_read } : m)
          );
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedId, queryClient]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!user || !selectedId || !msg) return;
    setInput("");
    sendMutation.mutate({ receiverId: selectedId, message: msg });
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday
      ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const initials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Contacts sidebar */}
        <div className={`w-80 flex-shrink-0 flex flex-col glass rounded-xl overflow-hidden ${selectedId ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-border">
            <h2 className="font-display font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Central de Conversas
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] text-muted-foreground">Acompanhamento humano inteligente</p>
              {(() => {
                const onlineContacts = contacts.filter(c => c.is_online).length;
                return onlineContacts > 0 ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {onlineContacts} online
                  </span>
                ) : null;
              })()}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contactsLoading ? (
              <div className="space-y-3 p-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : contacts.map(c => (
              <div
                key={c.user_id}
                onClick={() => setSearchParams({ with: c.user_id })}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border/50 ${
                  selectedId === c.user_id ? "bg-primary/10" : "hover:bg-muted"
                }`}
              >
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials(c.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                    c.is_online ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{c.full_name}</span>
                    {c.last_time && <span className="text-[10px] text-muted-foreground">{formatTime(c.last_time)}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.last_message || "Iniciar conversa..."}</p>
                </div>
                {c.unread > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-[10px] h-5 w-5 p-0 flex items-center justify-center rounded-full">{c.unread}</Badge>
                )}
              </div>
            ))}
            {!contactsLoading && contacts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground text-center">Nenhum contato disponível</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        {selectedId ? (
          <div className="flex-1 flex flex-col glass rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchParams({})}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="relative">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials(selectedName)}</AvatarFallback>
                </Avatar>
                {selectedContact?.is_online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
                )}
              </div>
              <div className="flex-1">
                <span className="font-medium text-sm">{selectedName}</span>
                {isPatient && (
                  <NutritionistStatusIndicator patientId={user?.id} compact />
                )}
                {selectedContact?.is_online && isNutritionist && (
                  <p className="text-[10px] text-emerald-500 font-medium">Online agora</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messagesLoading ? (
                <div className="space-y-4 py-8">
                  {[1,2,3].map(i => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                      <Skeleton className="h-12 w-48 rounded-2xl" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
                  <p className="text-xs text-muted-foreground mt-1">Envie uma mensagem para iniciar a conversa 💬</p>
                </div>
              ) : (
                <AnimatePresence>
                  {messages.map(msg => {
                    const isMine = msg.sender_id === user?.id;
                    const isPending = !!(msg as any)._pending;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: isPending ? 0.6 : 1, y: 0 }}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                          isMine
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        }`}>
                          {msg.image_url && (
                            <img src={msg.image_url} alt="Imagem" className="rounded-lg mb-2 max-w-full max-h-48 object-cover" />
                          )}
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                            <span className="text-[10px] opacity-70">
                              {isPending ? "Enviando..." : formatTime(msg.created_at)}
                            </span>
                            {isMine && !isPending && (msg.is_read ? <CheckCheck className="w-3 h-3 opacity-70" /> : <Check className="w-3 h-3 opacity-50" />)}
                            {isMine && isPending && <Clock className="w-3 h-3 opacity-40" />}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick Replies (for nutritionists) */}
            {isNutritionist && selectedId && (
              <div className="px-3 pt-2">
                <QuickReplySuggestions patientId={selectedId} onSelect={(msg) => sendMessage(msg)} />
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Digite uma mensagem..."
                className="flex-1"
              />
              <Button onClick={() => sendMessage()} className="gradient-primary" disabled={!input.trim() || sendMutation.isPending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center glass rounded-xl">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
              <h3 className="font-display font-semibold text-lg mb-1">Central de Conversas</h3>
              <p className="text-muted-foreground text-sm">Selecione um contato para iniciar o acompanhamento</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
