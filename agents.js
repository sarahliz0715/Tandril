// Agent SDK — connects ChatInterface to the ai-coach-chat edge function
// and the orion_conversations / orion_messages tables for persistence + realtime

import { supabase } from './lib/supabaseClient';

export const agentSDK = {
  /**
   * Create a new Orion conversation record in orion_conversations
   */
  async createConversation({ agent_name, metadata = {} }) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Not authenticated');

    const title = metadata?.name || 'New conversation';

    const { data, error } = await supabase
      .from('orion_conversations')
      .insert({ user_id: user.id, title })
      .select()
      .single();

    if (error) throw new Error(`Failed to create conversation: ${error.message}`);

    return { id: data.id, messages: [], metadata: { agent_name, ...metadata } };
  },

  /**
   * Load an existing conversation + its messages
   */
  async getConversation(id) {
    const { data: conv, error: convError } = await supabase
      .from('orion_conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (convError) throw new Error(`Failed to load conversation: ${convError.message}`);

    const { data: msgs, error: msgsError } = await supabase
      .from('orion_messages')
      .select('role, content, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (msgsError) throw new Error(`Failed to load messages: ${msgsError.message}`);

    return {
      id: conv.id,
      messages: (msgs || []).map(m => ({ role: m.role, content: m.content, created_date: m.created_at })),
      metadata: { name: conv.title },
    };
  },

  /**
   * Subscribe to new messages in a conversation via Supabase realtime.
   * Returns an unsubscribe function.
   */
  subscribeToConversation(id, callback) {
    const channel = supabase
      .channel(`orion_messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orion_messages',
          filter: `conversation_id=eq.${id}`,
        },
        async () => {
          // Re-fetch all messages so callback always gets the full ordered list
          const { data: msgs } = await supabase
            .from('orion_messages')
            .select('role, content, created_at')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true });

          callback({
            messages: (msgs || []).map(m => ({ role: m.role, content: m.content, created_date: m.created_at })),
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  /**
   * Add a user message and get Orion's response.
   * Calls the ai-coach-chat edge function which handles Claude + DB persistence.
   */
  async addMessage(conversation, { role, content, file_urls = [] }) {
    const { data, error } = await supabase.functions.invoke('ai-coach-chat', {
      body: {
        conversation_id: conversation.id,
        message: content,
        uploaded_files: file_urls,
      },
    });

    if (error) throw new Error(`Orion failed to respond: ${error.message}`);
    if (data && !data.success) throw new Error(data.error || 'Orion returned an error');

    return data;
  },
};
