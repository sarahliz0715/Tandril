// Placeholder for agent SDK
export const agentSDK = {
  // Placeholder conversation management functions
  async listConversations({ agent_name }) {
    console.warn('agentSDK.listConversations not implemented yet');
    return [];
  },

  async createConversation({ agent_name, metadata }) {
    console.warn('agentSDK.createConversation not implemented yet');
    return { id: 'placeholder', agent_name, metadata, messages: [] };
  },

  async deleteConversation(convId) {
    console.warn('agentSDK.deleteConversation not implemented yet');
    return { success: true };
  },

  async addMessage(conversation, message) {
    console.warn('agentSDK.addMessage not implemented yet');
    return { ...message, id: 'placeholder', created_at: new Date().toISOString() };
  }
};
