import { useState, useEffect, useCallback } from 'react';
import { agentSDK } from '@/agents';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export function useAIAdvisorConversations(conversationIdFromUrl, navigate) {
    const [conversations, setConversations] = useState([]);
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    const [initialPrompt, setInitialPrompt] = useState('');
    const [loadingConversations, setLoadingConversations] = useState(true);

    const loadConversations = useCallback(async () => {
        setLoadingConversations(true);
        try {
            const convs = await agentSDK.listConversations({ agent_name: 'business_advisor' });
            // Sort by most recently updated message, or created_date if no messages
            const sortedConvs = convs.sort((a, b) => {
                const lastMsgA = a.messages?.[a.messages.length - 1]?.created_date;
                const lastMsgB = b.messages?.[b.messages.length - 1]?.created_date;
                const dateA = lastMsgA ? new Date(lastMsgA) : new Date(a.created_date);
                const dateB = lastMsgB ? new Date(lastMsgB) : new Date(b.created_date);
                return dateB - dateA;
            });
            setConversations(sortedConvs);
        } catch (error) {
            console.error('Failed to load conversations:', error);
            toast.error('Could not load your conversations.');
        } finally {
            setLoadingConversations(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const promptFromUrl = params.get('prompt');
        if (promptFromUrl) {
            setInitialPrompt(promptFromUrl);
            createNewConversation(promptFromUrl);
        } else if (conversationIdFromUrl) {
            setSelectedConversationId(conversationIdFromUrl);
        }
    }, [conversationIdFromUrl]);

    const createNewConversation = useCallback(async (prompt = '') => {
        try {
            const newConversation = await agentSDK.createConversation({
                agent_name: 'business_advisor',
                metadata: {
                    name: prompt ? `Chat: ${prompt.substring(0, 30)}...` : `New Chat - ${new Date().toLocaleString()}`,
                }
            });
            
            if (prompt) {
                await agentSDK.addMessage(newConversation, { role: 'user', content: prompt });
            }

            toast.success('New conversation started!');
            await loadConversations();
            navigate(createPageUrl(`AIAdvisor?conversationId=${newConversation.id}`));
            setSelectedConversationId(newConversation.id);
            setInitialPrompt(prompt);

        } catch (error) {
            toast.error('Failed to create new conversation.');
            console.error(error);
        }
    }, [navigate, loadConversations]);

    const handleConversationSelect = (convId) => {
        setSelectedConversationId(convId);
        navigate(createPageUrl(`AIAdvisor?conversationId=${convId}`));
    };

    const handleConversationDelete = async (convId) => {
        try {
            await agentSDK.deleteConversation(convId);
            toast.success('Conversation deleted.');
            
            if (selectedConversationId === convId) {
                setSelectedConversationId(null);
                navigate(createPageUrl('AIAdvisor'));
            }

            loadConversations();

        } catch (error) {
            toast.error('Failed to delete conversation.');
            console.error('Delete conversation error:', error);
        }
    };

    return {
        conversations,
        selectedConversationId,
        loadingConversations,
        initialPrompt,
        setInitialPrompt,
        createNewConversation,
        handleConversationSelect,
        handleConversationDelete
    };
}