import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { queryKeys } from "./queryKeys";
import { toast } from "sonner";
import { offlineQueue } from "@v1/lib/offlineSync";

export interface ChatContact {
  user_id: string;
  full_name: string;
  unread: number;
  last_message?: string;
  last_time?: string;
  is_online?: boolean;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  image_url?: string | null;
  _pending?: boolean; // Optimistic offline flag
  _tempId?: string;
}

export function useChatContacts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.chat.contacts(user?.id ?? ""),
    enabled: !!user,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const userId = user!.id;
      const { data: links } = await supabase.from("nutritionist_patients")
        .select("nutritionist_id, patient_id").eq("status", "active")
        .or(`nutritionist_id.eq.${userId},patient_id.eq.${userId}`);
      if (!links?.length) return [];

      const otherIds = links.map(l => l.nutritionist_id === userId ? l.patient_id : l.nutritionist_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", otherIds);

      const { data: presenceData } = await (supabase as any)
        .from("user_presence")
        .select("user_id, is_online, last_seen_at")
        .in("user_id", otherIds);

      const presenceMap = new Map<string, boolean>();
      (presenceData || []).forEach((p: any) => {
        const diffMin = (Date.now() - new Date(p.last_seen_at).getTime()) / 60000;
        presenceMap.set(p.user_id, p.is_online && diffMin < 2);
      });

      const contactList: ChatContact[] = [];
      for (const p of profiles || []) {
        const { count } = await supabase.from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("sender_id", p.user_id).eq("receiver_id", userId).eq("is_read", false);

        const { data: lastMsg } = await supabase.from("chat_messages")
          .select("message, created_at")
          .or(`and(sender_id.eq.${userId},receiver_id.eq.${p.user_id}),and(sender_id.eq.${p.user_id},receiver_id.eq.${userId})`)
          .order("created_at", { ascending: false }).limit(1);

        contactList.push({
          user_id: p.user_id,
          full_name: p.full_name || "Sem nome",
          unread: count || 0,
          last_message: lastMsg?.[0]?.message,
          last_time: lastMsg?.[0]?.created_at,
          is_online: presenceMap.get(p.user_id) || false,
        });
      }

      contactList.sort((a, b) => {
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        return (b.last_time || "").localeCompare(a.last_time || "");
      });

      return contactList;
    },
  });
}

export function useChatMessages(contactId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.chat.messages(user?.id ?? "", contactId ?? ""),
    enabled: !!user && !!contactId,
    staleTime: 10 * 1000,
    queryFn: async () => {
      const userId = user!.id;
      const { data } = await supabase.from("chat_messages")
        .select("*")
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userId})`)
        .order("created_at", { ascending: true });

      // Mark as read
      await supabase.from("chat_messages")
        .update({ is_read: true })
        .eq("sender_id", contactId!).eq("receiver_id", userId).eq("is_read", false);

      // Merge pending offline messages for this contact
      const pendingChat = offlineQueue.getPendingChatMessages()
        .filter(a => a.data.receiver_id === contactId && a.data.sender_id === userId);

      const serverMessages = (data || []) as Message[];
      const offlineMessages: Message[] = pendingChat.map(a => ({
        id: a.tempId || a.id,
        sender_id: a.data.sender_id,
        receiver_id: a.data.receiver_id,
        message: a.data.message,
        is_read: false,
        created_at: new Date(a.timestamp).toISOString(),
        _pending: true,
        _tempId: a.tempId,
      }));

      return [...serverMessages, ...offlineMessages];
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ receiverId, message }: { receiverId: string; message: string }) => {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Optimistic: add to cache immediately
      const optimisticMsg: Message = {
        id: tempId,
        sender_id: user!.id,
        receiver_id: receiverId,
        message,
        is_read: false,
        created_at: new Date().toISOString(),
        _pending: !navigator.onLine,
        _tempId: tempId,
      };

      queryClient.setQueryData<Message[]>(
        queryKeys.chat.messages(user?.id ?? "", receiverId),
        (old) => [...(old || []), optimisticMsg]
      );

      if (!navigator.onLine) {
        // Queue for later
        offlineQueue.add({
          type: "chat_message",
          table: "chat_messages",
          id: tempId,
          tempId,
          data: { sender_id: user!.id, receiver_id: receiverId, message },
          timestamp: Date.now(),
        });
        return optimisticMsg;
      }

      // Online: send immediately
      const { data, error } = await supabase.from("chat_messages").insert({
        sender_id: user!.id, receiver_id: receiverId, message,
      } as any).select().single();
      if (error) throw error;

      // Replace optimistic message with real one
      queryClient.setQueryData<Message[]>(
        queryKeys.chat.messages(user?.id ?? "", receiverId),
        (old) => (old || []).map(m => m.id === tempId ? { ...data, _pending: false } as Message : m)
      );

      return data as Message;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.contacts(user?.id ?? "") });
    },
    onError: (_err, variables) => {
      // On error, queue offline
      const tempId = `retry_${Date.now()}`;
      offlineQueue.add({
        type: "chat_message",
        table: "chat_messages",
        id: tempId,
        tempId,
        data: { sender_id: user!.id, receiver_id: variables.receiverId, message: variables.message },
        timestamp: Date.now(),
      });
      toast.error("Sem conexão — mensagem será enviada ao reconectar");
    },
  });
}
