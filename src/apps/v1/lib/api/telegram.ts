import { supabase } from '@v1/integrations/supabase/client';

export const telegramApi = {
  async getMe() {
    const { data, error } = await supabase.functions.invoke('send-telegram', {
      body: { action: 'getMe' },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  async sendMessage(chatId: string | number, text: string, parseMode = 'HTML') {
    const { data, error } = await supabase.functions.invoke('send-telegram', {
      body: { chat_id: chatId, text, parse_mode: parseMode },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },
};
