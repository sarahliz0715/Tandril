// Agent SDK — connects ChatInterface to the ai-coach-chat edge function
// and the business_coaching table for conversation persistence + realtime

import { supabase } from './api/supabaseClient';

export const agentSDK = {
  /**
   * Create a new Orion conversation record in business_coaching
   */
  async createConversation({ agent_name, metadata = {} }) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('business_coaching')
      .insert({
        user_id: user.id,
        coaching_type: 'conversation',
        content: { messages: [] },
        metadata: { agent_name, ...metadata },
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create conversation: ${error.message}`);

    return { id: data.id, messages: [], metadata: data.metadata };
  },

  /**
   * Load an existing conversation by ID
   */
  async getConversation(id) {
    const { data, error } = await supabase
      .from('business_coaching')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Failed to load conversation: ${error.message}`);

    return {
      id: data.id,
      messages: data.content?.messages || [],
      metadata: data.metadata || {},
    };
  },

  /**
   * Subscribe to realtime updates on a conversation.
   * Returns an unsubscribe function.
   */
  subscribeToConversation(id, callback) {
    const channel = supabase
      .channel(`conversation:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'business_coaching',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          callback({
            messages: payload.new.content?.messages || [],
            metadata: payload.new.metadata || {},
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  /**
   * Add a message to a conversation and get Orion's AI response.
   * Calls the ai-coach-chat edge function which handles Claude + DB persistence.
   */
  async addMessage(conversation, { role, content, file_urls = [] }) {
    const { data, error } = await supabase.functions.invoke('ai-coach-chat', {
      body: {
        conversation_id: conversation.id,
        message: { role, content, file_urls },
      },
    });

    if (error) throw new Error(`Orion failed to respond: ${error.message}`);
    if (data && !data.success) throw new Error(data.error || 'Orion returned an error');

    return data;
  },
};
